var Client = require("imap");
var async = require("async");
var inspect = require("util").inspect;

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
 * Connect to IMAP server. Returns in then() if success.
 *
 * @returns {Promise}
 */

Imap.prototype.connect = function() {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.connect();
    self.client.once("ready", function(){
      console.log("Connection ready");
      self.connected = true;
      resolve();
    })
    self.client.once("error", function(err) {
      console.log(err);
      self.connected = false;
      reject(err);
    })
    self.client.once("end", function() {
      self.connected = false;
      console.log("Connection ended");
    })
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
          if (mboxes[index].children !=null) {
            var children = Object.keys(mboxes[index].children);
            async.each(children, function iterator(child, doneIteratingChildrens){
              var currentSpecialUse = mboxes[index].children[child].special_use_attrib; 
              if (currentSpecialUse == "\\" + special) {
                specials[special] = {
                  path : index + mboxes[index].delimiter + child
                }
              }
            }, function(err) {
              doneIteratingCildrens(err);
            })
          } else {
            if (mboxes[index].special_use_attribs == "\\" + special || mboxes[index].attribs.indexOf("\\" + special)) {
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
 * @param {Object} searchParams - Search parameters
 * @returns {Promise}
 * 
 */
Imap.prototype.listBox = function(name, start, limit, searchParams) {
  var self = this;
  return new Promise(function(resolve, reject){
    var bodies = searchParams || 'HEADER.FIELDS (FROM TO SUBJECT DATE)';
    var result = [];
    self.client.openBox(name, true, function(err, box){
      if (err) {
        return reject(err);
      }
      console.log("total message " + box.messages.total);
      var fetchLimit = box.messages.total;
      if (limit) {
        fetchLimit = start + limit - 1;
      }
      var seqArray = []
      for (var i = start || 1; i <= fetchLimit; i++) {
        seqArray.push(i);
      }
      async.each(seqArray, function iterator(seq, doneIteratingMessages) {
        var mail = {}
        var f = self.client.seq.fetch(seq, {
          bodies : bodies,
          struct : true
        });
        f.on("message", function(msg, seqno){
          var prefix = "(#" + seqno + ")";
    
          msg.on("body", function(stream, info) {
            var buffer = "";
            stream.on("data", function(chunk) {
              buffer += chunk.toString("utf8");
            });
            stream.once("end", function(attrs){
              mail.header = Client.parseHeader(buffer, true);
            });
          })
          msg.once("attributes", function(attrs) {
              mail.attributes = attrs;
          })
          msg.once("end", function(){
            result.push(mail);
          })
        });
        f.once("error", function(err) {
          console.log("Fetch error : " + err);
          doneIteratingMessages(err);
        })
        f.once("end", function(err) {
          doneIteratingMessages(err);
        })
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
Imap.prototype.retrieveMessage = function(boxName, id) {
  var self = this;
  return new Promise(function(resolve, reject){
    var result = [];
    self.client.openBox(boxName, true, function(err, box){
      if (err) {
        return reject(err);
      }
      var mail = {}
      self.client.search([id.toString()], function(err, result){
        if (err) {
          return reject(err);
        }
        if (result.length == 0) {
          var err = new Error("Message UID not found");
          return reject(err);
        }
        var mail = {}
        var f = self.client.seq.fetch(result, {
          bodies : "",
          struct : true
        });
        f.on("message", function(msg, seqno){
          var prefix = "(#" + seqno + ")";
    
          msg.on("body", function(stream, info) {
            var buffer = "";
            stream.on("data", function(chunk) {
              buffer += chunk.toString("utf8");
            });
            stream.once("end", function(attrs){
              mail.buffer = buffer;
            });
          })
          msg.once("attributes", function(attrs) {
              mail.attributes = attrs;
          })
          msg.once("end", function(){
            resolve(mail);
          })
        });
        f.once("error", function(err) {
          console.log("Fetch error : " + err);
          reject(err);
        })
      });
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
      /* resolve(); */
      console.log(1);
      self.client.move([id.toString()], newBox, function(err){
        console.log(2);
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
    self.client.openBox(boxName, true, function(err){
      if (err) {
        return reject(err);
      }
      self.client.search([id.toString()], function(err, result){
        self.client.seq.addFlags([id.toString()], "\\Deleted", function(err){
          if (err) {
            return reject(err);
          }
          self.client.seq.move([id.toString()], self.specials.Trash.path, function(err, code){
            if (err) {
              return reject(err);
            }
            resolve();
          });
        })
      });
    })
  })
}

/**
 * Creates an new email message in the Draft box
 *
 * @param {String} messageData - The id of the message, in string or buffer
 * @returns {Promise}
 */
Imap.prototype.newMessage = function(messageData) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.append(messageData, { mailbox : self.specials.Drafts.path, flags : "\\Seen"}, function(err){
      if (err) {
        return reject(err);
      }
      resolve();
    })
  })
}

exports.module = Imap;
