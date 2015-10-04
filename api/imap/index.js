var Client = require("imap");
var async = require("async");
var inspect = require("util").inspect;
var Imap = function() {
  this.client = new Client({
    user : "testuser",
    password : "testpass",
    host : "localhost",
    port : 1143,
    tls : false
  });
  this.client.connect();
  this.client.once("ready", function(){
  })
  this.client.once("error", function(err) {
    console.log(err);
  })
  this.client.once("end", function() {
    console.log("Connection ended");
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
        reject(err);
      } else {
        resolve(boxes);
      }
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
    var bodies = searchParams || '';
    var result = [];
    self.client.openBox(name, true, function(err, box){
      if (err) {
        reject(err);
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
      console.log(seqArray);
      
      async.each(seqArray, function iterator(seq, callback) {
        var mail = {}
        var f = self.client.seq.fetch(seq, {
          bodies : bodies,
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
          reject(err);
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
        reject(err);
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
        reject(err);
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
        reject(err);
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
Imap.prototype.retrieveMessage = function(id) {
}

/**
 * Removes an email message
 *
 * @param {String} id - the id of the message
 */
Imap.prototype.removeMessage = function(id) {
}

/**
 * Moves an email message to another box
 *
 * @param {String} id - the id of the message
 * @param {String} newBox - the name of the box
 */
Imap.prototype.moveMessage = function(id, newBox) {
}

/**
 * Creates an new email message in the Draft box
 *
 * @param {String} messageData - the id of the message
 */
Imap.prototype.newMessage = function(messageData) {
}


exports.register = function(server, options, next) {
  new Imap(server, options, next);
  next();
};

exports.register.attributes = {
  pkg: require("./package.json")
};

exports.module = Imap;
