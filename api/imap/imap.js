var Client = require("imap");
var async = require("async");
var _ = require("lodash");
var inspect = require("util").inspect;

/**
 * Constructor
 *
 */

var Imap = function(credentials) {
  this.client = new Client(credentials);
}

/**
 * Connect to IMAP server
 * 
 */

Imap.prototype.connect = function() {
  var self = this;
  return new Promise(function(resolve, reject){
    self.client.connect();
    self.client.once("ready", function(){
      console.log("Connection ready");
      resolve();
    })
    self.client.once("error", function(err) {
      console.log(err);
      reject(err);
    })
    self.client.once("end", function() {
      console.log("Connection ended");
    })
  })
}

/**
 * Lists the mail boxes
 * 
 */

Imap.prototype.getSpecialBoxes = function() {
  var self = this;
  return new Promise(function(resolve, reject){
    var specials = {};
    var specialBoxes = ["Drafts", "Sent", "Spam", "Inbox", "Trash"];
    self.client.getBoxes(function(err, mboxes){
      if (err) {
        return reject(err);
      }
      var boxes = Object.keys(mboxes);
      async.each(specialBoxes, function iterator(special, callback) {
        async.each(boxes, function iterator(index, cb){
          if (mboxes[index].children !=null) {
            var childrens = Object.keys(mboxes[index].children);
            async.each(childrens, function iterator(child, cb){
              if (child == special) {
                specials[child] = {
                  path : index + mboxes[index].delimiter + child
                }
              }
            }, function(err) {
              cb();
            })
          }
          cb();
        }, function(err){
          callback();
        })
      }, function(err){
        self.specials = specials;
        resolve(specials)
      })
    })
  })
}

/**
 * Lists the mail boxes
 * 
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
 * Lists the contents of the mail box
 *
 * @param {String} name - the name of the box
 * @param {Number} start - the offset
 * @param {Number} limit - the expected number of result
 * @param {Object} searchParams - search parameters
 * 
 */
Imap.prototype.listBox = function(name, start, limit, searchParams) {
  var self = this;
  return new Promise(function(resolve, reject){
    var bodies = searchParams || 'HEADER';
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
      async.each(seqArray, function iterator(seq, callback) {
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
              mail.buffer = buffer;
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
        })
        f.once("end", function(err) {
          callback();
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
 * @param {String} name - the name of the box
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
 * @param {String} name - the name of the box
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
 * @param {String} oldName - the old name of the box
 * @param {String} newName - the new name of the box
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
 * @param {String} id - the id of the message
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
            /* result.push(mail); */
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
 * @param {String} id - the id of the message
 * @param {String} newBox - the name of the box
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
 * @param {String} id - the id of the message
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
 * @param {String} messageData - the id of the message
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
