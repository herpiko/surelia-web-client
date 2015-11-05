var Client = require("imap");
var async = require("async");
var inspect = require("util").inspect;
var MailParser = require("mailparser").MailParser;
var moment = require("moment");
var lodash = require("lodash");

/**
 * @typedef Promise
 *
 * @prototype {Function} then - When success, with it's result (if any)
 * @prototype {Function} catch - When fail, with it's error (if any)
 *
 */

/**
 * Imap Constructor
 *
 */

var Imap = function(credentials) {
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
              if (currentSpecialUse == "\\" + special) {
                specials[special] = {
                  path : index + mboxes[index].delimiter + child,
                  specialName : special
                }
              }
            }, function(err) {
              doneIteratingCildrens(err);
            })
          } else {
            if (mboxes[index].special_use_attribs == "\\" + special || mboxes[index].attribs.indexOf("\\" + special) == 0) {
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
              return s.specialName == box;
            })
          var isExists = lodash.some(boxes, function(b){
              return b == box;
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
        resolve(specials)
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
  return new Promise(function(resolve, reject){
    self.client.getBoxes(function(err, boxes){
      if (err) {
        return reject(err);
      }
      self.boxes = boxes;
      resolve(boxes);
    })
  })
}

/**
 * Lists the contents of the mail box. This function returns a list of messages' header and attributes
 *
 * @param {String} name - The name of the box
 * @param {Number} start - The offset
 * @param {Number} limit - The expected number of result
 * @param {Object} search - Search parameters
 * @returns {Promise}
 * 
 */
Imap.prototype.listBox = function(name, limit, page, search) {
  var self = this;
  var limit = limit || 10;
  var page = page || 1;
  var total;
  var isSearch = false;
  return new Promise(function(resolve, reject){
    var bodies = "HEADER.FIELDS (FROM TO SUBJECT DATE)";
    var result = [];
    var fetcher = function(seqs){
      var total = seqs.messages.total;
      var start = total - page * limit + 1;
      if (start < 0) {
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
          if (seqArray.length == limit) {
            break;
          }
        }
      } else {
        for (var i = start; i <= fetchLimit; i++) {
          seqArray.push(i);
          if (seqArray.length == limit) {
            break;
          }
        }
      }
      console.log("name" + name);
      console.log("limit" + limit);
      console.log("page" + page);
      console.log("search" + search);
      console.log("fetchLimit" + fetchLimit);
      console.log("start" + start);
      console.log("seqArray" + seqArray);
      async.each(seqArray, function iterator(seq, doneIteratingMessages) {
        var mail = {}
        try {
          if (seqs.messages.seqArray) {
            var f = self.client.fetch(seq, {
              bodies : bodies,
              struct : true
            });
          } else {
            var f = self.client.seq.fetch(seq, {
              bodies : bodies,
              struct : true
            });
          }
        } catch (err) {
          return reject(err);
        }
        f.on("message", function(msg, seqno){
          var prefix = "(#" + seqno + ")";
    
          msg.on("body", function(stream, info) {
            var buffer = "";
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
                  && (attrs.struct[i][0].disposition.type == "ATTACHMENT"
                  || attrs.struct[i][0].disposition.type == "attachment")
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
            result.push(mail);
          })
        });
        f.once("error", function(err) {
          doneIteratingMessages(err);
        })
        f.once("end", function(err) {
          doneIteratingMessages(err);
        })
      }, function(err){
        if (err) {
          return reject(err);
        }
        self.client.closeBox(function(err){
          if (err) {
            return reject(err);
          }
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
          resolve(obj);
        })
      })
    }
    if (name == "search" && search && search !== undefined) {
      name = "INBOX";
      isSearch = true;
    }
    self.client.openBox(name, true, function(err, seqs){
      if (err) {
        return reject(err);
      }
      if (isSearch) {
        self.client.search([["OR",["SUBJECT", search],["FROM", search]]], function(err, result){
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
    })
  })
}

/**
 * Creates a box
 *
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
 * Retrieves an email message
 *
 * @param {String} boxName - The name of the box
 * @param {Integer} id - The id of the message
 * @returns {Promise}
 */
Imap.prototype.retrieveMessage = function(id, boxName) {
  var self = this;
  return new Promise(function(resolve, reject){
    var result = [];
    var isSearch = false;
    if (boxName == "search") {
      boxName = "INBOX";
      isSearch = true;
    }
    self.client.openBox(boxName, true, function(err, box){
      if (err) {
        return reject(err);
      }
      var mail = {}
      if (isSearch) {
        try {
          var f = self.client.fetch(id.toString(), {
            bodies : "",
            struct : true
          });
        } catch (err) {
          return reject(err);
        }
      } else {
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
      }
      f.on("message", function(msg, seqno){
        var prefix = "(#" + seqno + ")";
        msg.on("body", function(stream, info) {
          var buffer = "";
          stream.on("data", function(chunk) {
            buffer += chunk.toString("utf8");
          });
          stream.once("end", function(attrs){
            mail.original = buffer;
          });
        })
        msg.once("attributes", function(attrs) {
            mail.hasAttachments = false;
            for (var i = 0; i < attrs.struct.length; i++) {
              if (attrs.struct[i]
                && attrs.struct[i][0]
                && attrs.struct[i][0].disposition
                && (attrs.struct[i][0].disposition.type == "ATTACHMENT"
                || attrs.struct[i][0].disposition.type == "attachment")
              ) {
                mail.hasAttachments = true;
                break;
              }
            }
            mail.attributes = attrs;
        })
        msg.once("end", function(){
          var mailparser = new MailParser();
          mailparser.on("end", function(mailObject){
            mail.parsed = mailObject;
            mail.parsed.date = moment(new Date(mail.parsed.date));
            mail.parsed.receivedDate = moment(new Date(mail.parsed.receivedDate));
            mail.boxName = (isSearch) ? "search" : boxName;
            resolve(mail);
          })
          mailparser.write(mail.original);
          mailparser.end();
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
Imap.prototype.moveMessage = function(id, oldBox, newBox) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.openBox(oldBox, true, function(err){
      if (err) {
        return reject(err);
      }
      self.client.move([id.toString()], newBox, function(err){
        if (err) {
          return reject(err);
        }
        resolve();
      });
    })
  })
}


/**
 * Removes an email message
 *
 * @param {Integer} id - The Id of the message
 * @param {String} boxName - The name of the box which the message is being removed from
 * @returns {Promise}
 */
Imap.prototype.removeMessage = function(id, boxName) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.openBox(boxName, false, function(err){
      if (err) {
        return reject(err);
      }
      self.getSpecialBoxes()
        .then(function(specials){
          if (specials.Trash && specials.Trash.path) {
            self.client.seq.move(id.toString(), specials.Trash.path, function(err, code){
              if (err) {
                return reject(err);
              }
              resolve();
            });
          } else {
            self.client.seq.move(id.toString(), "Trash", function(err, code){
              if (err) {
                return reject(err);
              }
              resolve();
            });
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
 * @returns {Promise}
 */
Imap.prototype.newMessage = function(messageData, draftPath) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.append(messageData, { mailbox : draftPath, flags : "\\Seen"}, function(err){
      if (err) {
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
    self.client.getQuota("", function(err, info){
      if (err) {
        return reject(err);
      }
      var quotaInfo;
      if (info && 
          info.resources && 
          info.resources.storage &&
          info.resources.storage.usage) { // no check on limits as it could be unlimited, not specified in the RFC, though
        quotaInfo = {
          usage: info.resources.storage.usage,
          limit: info.resources.storage.limit
        }
      } else {
        reject(new Error('malformed quota info'));
      }
      resolve(quotaInfo);
    })
  })
}


module.exports = Imap;
