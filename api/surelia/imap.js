var Client = require("imap");
var async = require("async");
var inspect = require("util").inspect;
var MailParser = require("mailparser").MailParser;
var moment = require("moment");
var lodash = require("lodash");
var fs = require("fs");
var Utils = require("./utils");
var crypto = require('crypto');
var base64Stream = require("base64-stream");
var Stream = require('stream');
var mongoose = require("mongoose");
var Grid = require("gridfs-stream");
var config = require('../../conf/prod/surelia');
var extend = require('util')._extend;
Grid.mongo = mongoose.mongo;
gfs = Grid(mongoose.connection.db);


/**
 * @typedef Promise
 *
 * @prototype {Function} then - When success, with it's result (if any)
 * @prototype {Function} catch - When fail, with it's error (if any)
 *
 */

/**
 * Imap Constructor
 * @param {Object} credentials - Credentials object
 */

var Imap = function(credentials) {
  var credentials = extend({}, credentials);
  // Assign IMAP username prefix
  if (config.imapUsernamePrefix) {
    credentials.user = config.imapUsernamePrefix + credentials.user;
  }
  // Increase timeout
  credentials.connTimeout = 60000;
  credentials.authTimeout = 60000;
  this.client = new Client(credentials);
  this.connected = false;
}

/**
 * Get information whether the IMAP client is connected or not
 *
 * @returns {Boolean} - Boolean value that represents whether the IMAP client is connected or not
 */

Imap.prototype.isConnected = function() {
  var self = this;
  return self.connected
}

/**
 * Ends IMAP client connection
 *
 */

Imap.prototype.end = function() {
  var self = this;
  if (self.client) {
    self.client.destroy();
  }
}

/**
 * Connect to IMAP server. Returns in then() if success.
 *
 * @returns {Promise}
 */

Imap.prototype.connect = function() {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.once("ready", function(){
      self.connected = true;
      resolve();
    })
    self.client.once("error", function(err) {
      self.connected = false;
      reject(err);
    })
    self.client.once("end", function() {
      self.connected = false;
    })
    self.client.connect();
  })
}

/**
 * Lists the mail's special-use boxes. This function returns an array of special use boxes with it's path.
 *
 * @returns {Promise}
 */

Imap.prototype.getSpecialBoxes = function() {
  var self = this;
  return new Promise(function(resolve, reject){
    var specials = {};
    // See : http://tools.ietf.org/html/rfc6154#page-3
    var specialBoxes = ["All", "Archive", "Drafts", "Sent", "Junk", "Inbox", "Trash"];
    self.client.getBoxes(function(err, mboxes){
      if (err) {
        return reject(err);
      }
      var boxes = Object.keys(mboxes);
      async.each(specialBoxes, function iterator(special, doneIteratingSpecialBoxes) {
        async.each(boxes, function iterator(index, doneIteratingBoxes){
          if (mboxes[index].children !== null) {
            var children = Object.keys(mboxes[index].children);
            async.each(children, function iterator(child, doneIteratingChildrens){
              var currentSpecialUse = mboxes[index].children[child].special_use_attrib; 
              if (currentSpecialUse === "\\" + special) {
                specials[special] = {
                  path : index + mboxes[index].delimiter + child,
                  specialName : special
                }
              }
            }, function(err) {
              doneIteratingCildrens(err);
            })
          } else {
            if ((mboxes[index].special_use_attribs === "\\" + special || (mboxes[index].attribs && mboxes[index].attribs.indexOf("\\" + special) === 0))
            || mboxes[index].special_use_attrib === "\\" + special || (mboxes[index].attrib && mboxes[index].attrib.indexOf("\\" + special) === 0)) {
              specials[special] = {
                path : index
              }
            }
          }
          doneIteratingBoxes();
        }, function(err){
          doneIteratingSpecialBoxes(err);
        })
      }, function(err){
        if (err) {
          return reject(err);
        }
        self.specials = specials;
        var essentialBoxes = ["Drafts", "Sent", "Trash"];
        lodash.some(essentialBoxes, function(box) {
          var isMatched = lodash.some(specials, function(s){
              return s.specialName === box;
            })
          var isExists = lodash.some(boxes, function(b){
              return b === box;
            })
          if (!isMatched && !isExists) {
            
            // Add new essential box, but do not wait
            self.client.addBox(box);

             
            specials[box] = {
              path : box,
              specialName : box
            }
          }
        })
        async.eachSeries(specials, function(box, cb){
          self.client.openBox(box.path, true, function(err, seqs){
            if (err) {
              return cb(err);
            }
            if (seqs.messages) {
              box.meta = seqs.messages;
            }
            self.client.closeBox(function(err){
              // Do not check closeBox's error
              // If it does not allowed now, go on
              cb();
            })
          })
        }, function(err){
          if (err) {
            return reject(err);
          }
          resolve(specials)
        })
      })
    })
  })
}

/**
 * Lists the mail boxes. This function returns  an array of top level mail boxes
 * 
 * @returns {Promise}
 */

Imap.prototype.getBoxes = function() {
  var self = this;
  var result = [];
  return new Promise(function(resolve, reject){
    self.client.getBoxes(function(err, boxes){
      if (err) {
        return reject(err);
      }
      self.boxes = boxes;
      // Circular object, need to be simplified
      var boxNames = Object.keys(boxes);
      async.eachSeries(boxNames, function(box, cb){
        if (boxes[box].attribs.indexOf("\\Noselect") > -1) {
          cb();
        } else {

          self.client.openBox(box, true, function(err, seqs){
            if (err && err.message.indexOf('Mailbox doesn\'t exist:') > -1) {
              // Skip inconsistent box existence
              return cb();
            } else if (err) {
              return cb(err);
            }
            var obj = {
              boxName : box,
            }
            if (seqs.messages) {
              obj.meta = seqs.messages;
            }
            result.push(obj);
            cb();
          })
        }
      }, function(err){
        if (err) {
          return reject(err);
        }
        resolve(result);
      })
    })
  })
}

/**
 * Lists the contents of the mail box. This function returns a list of messages' header and attributes
 *
 * @param {String} name - The name of the box
 * @param {Number} limit - The expected number of result
 * @param {Number} page - The page number
 * @param {Object} opts - Option, could countains search parameters
 * @returns {Promise}
 * 
 */
Imap.prototype.listBox = function(name, limit, page, opts) {
  var self = this;
  var opts = opts || {};
  var limit = limit || 10;
  var page = page || 1;
  var total;
  var unread;
  var isSearch = false;
  var isDraft = false;
  if (name.indexOf("Drafts") > -1) {
    isDraft = true;
  }
  return new Promise(function(resolve, reject){
    var bodies = "HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)";
    var result = [];
    var fetcher = function(seqs){
      var total = seqs.messages.total;
      unread = seqs.messages.new;
      var start = total - page * limit + 1;
      if (start < 1) {
        start = 1;
      }
      var fetchLimit = seqs.messages.total - (limit*page-limit);
      var seqArray = []
      if (seqs.messages.seqArray) {
        var index = seqs.messages.seqArray.indexOf(seqs.messages.seqArray[start]);
        for (var i = index - 1; i <= fetchLimit; i++) {
          if (seqs.messages.seqArray[i]) {
            seqArray.push(seqs.messages.seqArray[i]);
          }
          if (seqArray.length === limit) {
            break;
          }
        }
      } else {
        for (var i = start; i <= fetchLimit; i++) {
          seqArray.push(i);
          if (seqArray.length === limit) {
            break;
          }
        }
      }
      console.log("name " + name);
      console.log("limit " + limit);
      console.log("page " + page);
      console.log("fetchLimit " + fetchLimit);
      console.log("start " + start);
      console.log("seqArray " + seqArray);
      console.log("options " + JSON.stringify(opts));
      console.log("search criteria " + searchCriteria);
      async.each(seqArray, function iterator(seq, doneIteratingMessages) {
        var mail = {}
        try {
          var f = self.client.seq.fetch(seq, {
            bodies : bodies,
            struct : true
          });
        } catch (err) {
          return reject(err);
        }
        f.on("message", function(msg, seqno){
          var prefix = "(#" + seqno + ")";
    
          var buffer = "";
          msg.on("body", function(stream, info) {
            stream.on("data", function(chunk) {
              buffer += chunk.toString("utf8");
            });
            stream.once("end", function(attrs){
              mail.header = Client.parseHeader(buffer, true);
              // Normalization
              if (mail.header.date && mail.header.date[0]) {
                mail.header.date = moment(new Date(mail.header.date[0]));
              }
              if (mail.header.from && mail.header.from[0]) {
                mail.header.from = mail.header.from[0];
              }
              if (mail.header.subject && mail.header.subject[0]) {
                mail.header.subject = mail.header.subject[0];
              }
            });
          })
          msg.once("attributes", function(attrs) {
              mail.hasAttachments = false;
              for (var i = 0; i < attrs.struct.length; i++) {
                if (attrs.struct[i]
                  && attrs.struct[i][0]
                  && attrs.struct[i][0].disposition
                  && (attrs.struct[i][0].disposition.type === "ATTACHMENT"
                  || attrs.struct[i][0].disposition.type === "attachment")
                ) {
                  mail.hasAttachments = true;
                  break;
                }
              }
              mail.attributes = attrs;
              mail.seq = seq;
              mail.boxName = (isSearch) ? "search" : name;
          })
          msg.once("end", function(){
            var mailparser = new MailParser();
            mailparser.on("end", function(mailObject){
              mail.parsed = mailObject;
              result.push(mail);
            })
            mailparser.write(buffer);
            mailparser.end();
          })
        });
        f.once("end", function(err) {
          return doneIteratingMessages(err);
        })
      }, function(err){
        if (err) {
          return reject(err);
        }
        // Count the unread mail
        self.client.search(["UNSEEN"], function(err, unread){
          if (err) {
            return reject(err);
          }
          var unread = unread.length;
          self.client.closeBox(function(err){
            // Do not check closeBox's error
            // If it does not allowed now, go on
            result.reverse();
            var obj = {
              data : result,
              meta : {
                total : total,
                limit : parseInt(limit),
                page : parseInt(page),
                start : start,
              }
            }
            if (isDraft) {
              obj.meta.count = total;
            } else {
              obj.meta.count = unread;
            }
            resolve(obj);
          })
        })
      })
    }
    if (name === "search" && opts.search && opts.search !== undefined) {
      name = "INBOX";
      isSearch = true;
    } else {
      opts.search = "";
    }
    var searchCriteria = [["OR",["SUBJECT", opts.search],["FROM", opts.search]]];
    self.client.openBox(name, true, function(err, seqs){
      if (err) {
        return reject(err);
      }
      if (self.client.serverSupports("SORT") && (opts.sortBy || opts.filter)) {
        var sortCriteria = (opts && opts.sortBy) ? [opts.sortBy] : ["DATE"]; 
        opts.sortImportance = opts.sortImportance || "ascending";
        if (opts.sortImportance === "ascending") {
          if (sortCriteria[0] === "DATE") {
            sortCriteria[0] = sortCriteria[0];
          } else {
            sortCriteria[0] = "-" + sortCriteria[0];
          }
        } else if (opts.sortImportance === "descending") {
          if (sortCriteria[0] === "DATE") {
            sortCriteria[0] = "-" + sortCriteria[0];
          } else {
            sortCriteria[0] = sortCriteria[0];
          }
        }
        if (opts.filter) {
          var validFilter = [
            "ALL",
            "ANSWERED",
            "DELETED",
            "DRAFT",
            "FLAGGED",
            "NEW",
            "SEEN",
            "RECENT",
            "OLD",
            "UNANSWERED",
            "UNDELETED",
            "UNDRAFT",
            "UNFLAGGED",
            "UNSEEN",
          ];
          var isValidFilter = lodash.some(validFilter, function(filter){
            return opts.filter.toUpperCase() == filter;
          })
          if (isValidFilter) {
            searchCriteria[1] = opts.filter;
          } 
        }
        self.client.seq.sort(sortCriteria, searchCriteria, function(err, result){
          if (err) {
            return reject(err);
          }
          seqs.messages.total = result.length;
          seqs.messages.seqArray = result;
          fetcher(seqs);
        })
      } else {
        if (isSearch) {
          self.client.seq.search(searchCriteria, function(err, result){
            if (err) {
              return reject(err);
            }
            seqs.messages.total = result.length;
            seqs.messages.seqArray = result;
            fetcher(seqs);
          })
        } else {
          fetcher(seqs);
        }
      }
    })
  })
}

/**
 * Creates a box
 *
 * @param {String} name - New box name
 * @returns {Promise}
 */
Imap.prototype.createBox = function(name) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.addBox(name, function(err){
      if (err) {
        return reject(err);
      } else {
        resolve();
      }
    })
  })
}

/**
 * Removes a box
 *
 * @param {String} name - The name of the box
 * @returns {Promise}
 */
Imap.prototype.removeBox = function(name) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.delBox(name, function(err){
      if (err) {
        return reject(err);
      } else {
        resolve();
      }
    })
  })
}

/**
 * Rename box
 *
 * @param {String} oldName - The old name of the box
 * @param {String} newName - The new name of the box
 * @returns {Promise}
 */
Imap.prototype.renameBox = function(oldName, newName) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.renameBox(oldName, newName, function(err){
      if (err) {
        return reject(err);
      } else {
        resolve();
      }
    })
  })
}


/**
 * Add flags
 * The third parameter is required if the box need to be closed at the end
 *
 * @param {String} seq - Sequence number
 * @param {String} flag - Flag that will be added to the box
 * @param {String} boxName - The box name
 */


Imap.prototype.addFlag = function(seqs, flag, boxName) {
  var self = this;
  var flag = "\\" + flag;
  return new Promise(function(resolve, reject){
    if (boxName) {
      self.client.openBox(boxName, false, function(err, box){
        if (err) {
          return reject(err);
        }
        self.client.seq.addFlags(seqs, [flag], function(err){
          if (err) {
            console.log(err);
            return reject(err);
          }
          self.client.closeBox(function(){
            resolve();
          });
        }); 
      })
    } else {
      self.client.seq.addFlags(seqs, [flag], function(err){
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve();
      }); 
    }
  })
}

/**
 * Remove flags
 * The third parameter is required if the box need to be closed at the end
 *
 * @param {String} seq - Sequence number
 * @param {String} flag - Flag that will be removed from the box
 * @param {String} boxName - The box name
 */

Imap.prototype.removeFlag = function(seqs, flag, boxName) {
  var self = this;
  var flag = "\\" + flag;
  return new Promise(function(resolve, reject){
    if (boxName) {
      self.client.openBox(boxName, false, function(err, box){
        if (err) {
          return reject(err);
        }
        self.client.seq.delFlags(seqs, [flag], function(err){
          if (err) {
            console.log(err);
            return reject(err);
          }
          self.client.closeBox(function(){
            resolve();
          });
        }); 
      })
    } else {
      self.client.seq.delFlags(seqs, [flag], function(err){
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve();
      }); 
    }
  })
}

/**
 * Retrieves an email message
 *
 * @param {String} boxName - The name of the box
 * @param {Integer} id - The id of the message
 * @returns {Promise}
 */
Imap.prototype.retrieveMessage = function(id, boxName, socket) {
  var self = this;
  return new Promise(function(resolve, reject){
    var result = [];
    var isSearch = false;
    var isSearch = false;
    if (boxName === "search") {
      boxName = "INBOX";
      isSearch = true;
    }
    self.client.openBox(boxName, false, function(err, box){
      if (err) {
        return reject(err);
      }
      if (parseInt(id) > box.messages.total) {
        return reject(new Error("Nothing to fetch"));
      }
      try {
        var f = self.client.seq.fetch(id.toString(), {
          bodies : "",
          struct : true
        });
      } catch (err) {
        return reject(err);
      }
      f.on("message", function(msg, seqno){
        var mailparser = new MailParser({streamAttachments:true});
        var attachments = [];
        var prefix = "(#" + seqno + ")";
        var mail = {}
        mailparser.on("attachment", function(attachment, mail) {
          var id = mongoose.Types.ObjectId();
          // Encrypt the attachment before it superimposed to fs
          var key = id.toString() + new Date().valueOf().toString();
          var cipher = crypto.createCipher('aes192', key);
          var file = {
            _id : id,
            filename :  mail.meta.messageId,
            contentType : attachment.contentType,
            metadata : {
              attachmentId : id,
              key : key,
              contentType : attachment.contentType,
              charset : attachment.charset,
              fileName : attachment.fileName,
              contentDisposition: attachment.contentDisposition,
              transferEncoding : attachment.transferEncoding,
              generatedFileName : attachment.generatedFileName,
              contentId : attachment.contentId,
              checksum : attachment.checksum,
              length : attachment.length
            }
          }
          if (attachment.contentDisposition && attachment.contentDisposition.toLowerCase() === 'inline') {
            mail.hasInlineAttachments = true;
            file.metadata.content = '';
            attachment.stream.pipe(base64Stream.encode())
              .on('data', function(chunk){
                file.metadata.content += chunk.toString('utf8');
              })
              .on('finish', function(){
                attachments.push(file.metadata);
              })
          } else {
            attachments.push(file.metadata);
          }
          file.metadata.attachmentId = id;
          var gfsWs = gfs.createWriteStream(file);
          attachment.stream.pipe(base64Stream.encode()).pipe(cipher).pipe(gfsWs);
          gfsWs.on('close', function(){
            if (socket && socket.io && socket.room) {
              console.log('emit to ' + socket.room);
              socket.io.to(socket.room).emit('attachmentReady', key);
            }
          })
        })
        msg.on("body", function(stream, info) {
          stream.pipe(mailparser);
        })
        msg.once("attributes", function(attrs) {
          mail.hasAttachments = false;
          for (var i = 0; i < attrs.struct.length; i++) {
            if (attrs.struct[i]
              && attrs.struct[i][0]
              && attrs.struct[i][0].disposition
              && (attrs.struct[i][0].disposition.type === "ATTACHMENT"
              || attrs.struct[i][0].disposition.type === "attachment")
            ) {
              mail.hasAttachments = true;
              break;
            }
          }
          mail.attributes = attrs;
        })
        msg.once("end", function(){
          // Do nothing
        })
        mailparser.on("end", function(mailObject){
          mail.parsed = mailObject;
          // Assign attachment Id and decipher key
          mail.inlineAttachments = {}
          for (var i in attachments) {
              for (var j in mail.parsed.attachments) {
                if (attachments[i].contentId === mail.parsed.attachments[j].contentId) {
                  mail.parsed.attachments[j].attachmentId = attachments[i].attachmentId;
                  mail.parsed.attachments[j].key = attachments[i].key;
                  if (attachments[i].content) {
                    mail.inlineAttachments[attachments[i].contentId] = attachments[i].content;
                  }
                }
              }
          }
          mail.parsed.date = moment(new Date(mail.parsed.date));
          mail.parsed.receivedDate = moment(new Date(mail.parsed.receivedDate));
          mail.boxName = (isSearch) ? "search" : boxName;
          // flag it as SEEN
          if (isSearch) {
            self.client.addFlags(id.toString(), ["\\Seen"], function(err){
              if (err) {
                return reject(err);
              }
              resolve(mail);
            }); 
          } else {
            self.addFlag(id, "Seen", boxName)
              .then(function(){
                resolve(mail);
              })
              .catch(function(err){
                return reject(err);
              });
          }
        })
        msg.once("error", function(err) {
          return reject(err);
        })
      });
      f.once("error", function(err) {
        return reject(err);
      })
    })
  })
}

/**
 * Moves an email message to another box
 *
 * @param {Integer} id - The id of the message
 * @param {String} oldBox - The name of the old box
 * @param {String} newBox - The name of the new box
 * @returns {Promise}
 */
Imap.prototype.moveMessage = function(seqs, oldBox, newBox) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.openBox(oldBox, false, function(err){
      if (err) {
        return reject(err);
      }
      if (newBox.indexOf("Trash") > -1) {
        // Remove to trash
        self.removeMessage(seqs, oldBox)
          .then(function(){
            resolve();
          })
          .catch(function(err){
            reject(err);
          });
      } else if (newBox.indexOf("Archive") > -1) {
        self.removeMessage(seqs, oldBox, {archive : true})
          .then(function(){
            resolve();
          })
          .catch(function(err){
            reject(err);
          });
      } else {
        self.client.seq.move(seqs, newBox, function(err){
          if (err) {
            return reject(err);
          }
          resolve();
        });
      }
    });
  })
}


/**
 * Removes an email message
 *
 * @param {Integer} id - The Id of the message
 * @param {String} boxName - The name of the box which the message is being removed from
 * @param {Object} opts - Option
 * @returns {Promise}
 */
Imap.prototype.removeMessage = function(seqs, boxName, opts) {
  var self = this;
  var opts = opts || {}
  if (boxName === "search") {
    boxName = "INBOX";
  }
  return new Promise(function(resolve, reject){
    self.getSpecialBoxes()
      .then(function(specials){
        self.client.openBox(boxName, false, function(err){
          if (err) {
            return reject(err);
          }
          if (boxName.indexOf("Trash") > -1) {
            // Permanent delete
            var trashPath = (specials.Trash && specials.Trash.path) ? specials.Trash.path : "Trash";
            self.client.openBox(trashPath, false, function(err){
              if (err) {
                return reject(err);
              }
              self.addFlag(seqs, "Deleted")
                .then(function(){
                  self.client.expunge(function(err){
                    if (err) {
                      return reject(err);
                    }
                    resolve();
                  })
                })
                .catch(function(err){
                  return reject(err);
                });
            });
          } else {
            if (opts.archive) {
              // Archive it

              self.client.addBox('Archives', function(err){
                if (err) {
                  // Ignore err
                  console.log(err);
                }
                self.client.seq.move(seqs, 'Archives' , function(err, code){
                  if (err) {
                    return reject(err);
                  }
                  self.client.closeBox(function(err){
                    // Do not check closeBox's error, if it does not allowed now, go on
                    resolve();
                  })
                });
              })
            } else {
              if (specials.Trash && specials.Trash.path) {
                self.client.seq.move(seqs, specials.Trash.path, function(err, code){
                  if (err) {
                    return reject(err);
                  }
                  self.client.closeBox(function(err){
                    // Do not check closeBox's error, if it does not allowed now, go on
                    resolve();
                  })
                });
              } else {
                self.client.seq.move(seqs, "Trash", function(err, code){
                  if (err) {
                    return reject(err);
                  }
                  self.client.closeBox(function(err){
                    // Do not check closeBox's error, if it does not allowed now, go on
                    resolve();
                  })
                });
              }
            }
          }
      })
      .catch(function(err){
        return reject(err);
      })
    })
  })
}

/**
 * Creates an new email message in the Draft box
 *
 * @param {String} messageData - The id of the message, in string or buffer
 * @param {String} draftPath - The path of draft box
 * @returns {Promise}
 */
Imap.prototype.newMessage = function(messageData, draftPath) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.append(messageData, { mailbox : draftPath, flags : "\\Seen"}, function(err){
      if (err) {
        console.log(err);
        return reject(err);
      }
      resolve();
    })
  })
}

/**
 * Gets mailbox quota info 
 *
 * @returns {Promise}
 */
Imap.prototype.quotaInfo = function() {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.getQuotaRoot("INBOX", function(err, entries){
      if (err) {
        return reject(err);
      }
      var quotaInfo;
      for (var entry in entries) {
        // take only the first entry
        var info = entries[entry];
        if (info && 
            info.storage) { // no check on limits as it could be unlimited, not specified in the RFC, though
          quotaInfo = {
            usage: info.storage.usage,
            limit: info.storage.limit,
            percentage: parseInt((info.storage.usage/info.storage.limit)*100) + "%"
          }
          break;
        } else {
          reject(new Error('malformed quota info'));
        }
      }
      resolve(quotaInfo);
    })
  })
}


module.exports = Imap;
