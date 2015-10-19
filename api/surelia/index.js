var mongoose = require("mongoose");
var IMAP = require("./imap");
var SMTP = require("./smtp");
var Pool = require("./pool");
var composer = require("mailcomposer");
var forge = require("node-forge");
var config = require('../../conf/prod/surelia');


var ImapAPI = function(server, options, next) {
  this.server = server;
  this.options = options || {};
  this.registerEndPoints();
}

ImapAPI.prototype.registerEndPoints = function(){
  var self = this;
  self.server.route({
    method : "POST",
    path : "/api/1.0/send",
    handler : function(request, reply){
      self.send(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/auth",
    handler : function(request, reply){
      self.auth(request, reply);
    }
  })
  self.server.route({
    method : "GET",
    path : "/api/1.0/special-boxes",
    handler : function(request, reply){
      self.getSpecialBoxes(request, reply);
    }
  })
  self.server.route({
    method : "GET",
    path : "/api/1.0/boxes",
    handler : function(request, reply){
      self.getBoxes(request, reply);
    }
  })
  self.server.route({
    method : "GET",
    path : "/api/1.0/list-box",
    handler : function(request, reply){
      self.listBox(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/box",
    handler : function(request, reply){
      self.addBox(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/rename-box",
    handler : function(request, reply){
      self.renameBox(request, reply);
    }
  })
  self.server.route({
    method : "DELETE",
    path : "/api/1.0/box",
    handler : function(request, reply){
      self.removeBox(request, reply);
    }
  })
  self.server.route({
    method : "GET",
    path : "/api/1.0/message",
    handler : function(request, reply){
      self.retrieveMessage(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/move-message",
    handler : function(request, reply){
      self.moveMessage(request, reply);
    }
  })
  self.server.route({
    method : "DELETE",
    path : "/api/1.0/message",
    handler : function(request, reply){
      self.removeMessage(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/message",
    handler : function(request, reply){
      self.newMessage(request, reply);
    }
  })
  self.server.route({
    method : "GET",
    path : "/api/1.0/logout",
    handler : function(request, reply){
      self.logout(request, reply);
    }
  })
}

/**
 * @typedef SendPayload
 * @property {String} username - Email to  connect to SMTP server
 * @property {String} password - Password of the email
 * @property {String} host - Hostname of the SMTP server
 * @property {String} port - Port of the SMTP service
 * @property {Boolean} requireTLS - Set true to enable TLS
 * @property {Boolean} secure - Set true to enable SSL
 * @property {String} from - Email of the sender
 * @property {String} recipients - Email of the recipient(s), separated by semicolon
 * @property {String} sender - Sender name
 * @property {String} subject - Subject of the message
 * @property {String} text - Message content
 *
 */

/**
 * Send mail
 * @param {SendPayload} request.payload
 */

ImapAPI.prototype.send = function(request, reply) {

  if (!request.headers.token && !request.headers.username) {
    var err = new Error("Token needed");
    return reply({err : err.message}).code(500);
  }
  console.log(request.headers.token);
  // This token is a public key that encrypt credential password which has been stored in db
  // Get the public key's pair (private key) in purpose to decrypt password
  keyModel().findOne({publicKey : request.headers.token}).select().lean().exec(function(err, keyPair){
    if (err) {
      return reply(err);
    } else if (!keyPair) {
      return reply("No credential stored in backend").code(401);
    } else {
      var privateKey = forge.pki.privateKeyFromPem(keyPair.privateKey);
      model().findOne({publicKey : request.headers.token}).select().lean().exec(function(err, result) {
        if (err) {
          return reply(err);
        } else if (!keyPair) {
          return reply("No credential stored in backend").code(401);
        } else {
          // Dercypt the password
          console.log("decrypt password");
          var password = privateKey.decrypt(result.password);
          // Mandatory option
          var options = {
            host : result.smtpHost,
            port : result.smtpPort.toString(),
          }
          if (result.smtpTLS) {
            options.requireTLS = true;
          }
          if (result.smtpSecure) {
            options.secure = true;
          }
          console.log("options");
          console.log(options);
          console.log(result.username);
          console.log(password);

          var smtp = new SMTP(options);
          smtp.connect()
            .then(function(){
              console.log(0);
              smtp.auth(result.username, password)
                .then(function(){
                  var payload = request.payload;
                  var recipients = payload.recipients.split(";");
                  var msg = {
                    from : payload.from,
                    to : recipients,
                    sender : payload.sender,
                    subject : payload.subject,
                    text : payload.text
                  }
                  console.log(msg);
                  var newMessage = composer(msg)
                  newMessage.build(function(err, message){
                    if (err) {
                      return reply({error : err.message}).code(500);
                    }
                    console.log(message);
                    smtp.send(payload.sender, payload.recipients, message)
                      .then(function(info){
                        reply(info).type("application/json");
                      })
                      .catch(function(err){
                        reply({error : err.message}).code(500);
                      })
                  })
                })
                .catch(function(err){
                  reply({error : err.message}).code(500);
                })
            })
            .catch(function(err){
              reply({error : err.message}).code(500);
            })
        }
      })
    }
  })
}

/**
 * Create new pool and Imap connection instance
 * @param {Object} request - Hapi's request object
 * @param {Object} reply - Hapi's reply object
 * @param {Object} credential - Crediential object, contains : host, port, tls, username, password, publicKey
 * @param {Callback} callback - Return Imap object.
 * @static
 */

var createPool = function(request, reply, credential, callback){
  var pool = Pool.getInstance();
  var id = credential.user;
  var createFunc = function(){
    var imap = new IMAP(credential);
    return imap;
  }
  var destroyFunc = function(){
    // do nothing
  }
  try {
    var client = pool.create(id, null, createFunc, destroyFunc);
  } catch(err) {
    return reply(err);
  }
  callback(client);
}

/**
 * Check whether the pool is exist/active or not, then execute the real function 
 * @param {Object} request - Hapi's request object
 * @param {Object} reply - Hapi's reply object
 * @param {Function} realFunc - The function that will be executed after the pool has been elaborated.
 * @static
 */

var checkPool = function(request, reply, realFunc) {
  return new Promise(function(resolve, reject){
    var pool = Pool.getInstance();
    console.log("pool map");
    console.log(Object.keys(pool.map));
    var id = request.headers.username;
    console.log(id);
    // Check if the pool is exist
    if (pool.map[id]) {
      console.log("pool already exist");
      console.log("print current pool");
      if (pool.map[id].obj.client.state == "disconnected") {
        var client = pool.get(id);
        console.log("connecting");
        client.connect()
          .then(function(){
            realFunc(client, request, reply);
          })
          .catch(function(err){
            if (err) {
              return reply({err : err.message}).code(500);
            }
          })
      } else {
        // Execute real function
        realFunc(pool.map[id].obj, request, reply);
      }
    } else {
      console.log("initiate new pool");
      if (request.headers.token) {
        // Pool doesn't exists, Check if there is a token in request header.
        console.log("client has token");
        console.log(request.headers.token);
        // This token is a public key that encrypt credential password which has been stored in db
        // Get the public key's pair (private key) in purpose to decrypt password
        keyModel().findOne({publicKey : request.headers.token}).select().lean().exec(function(err, keyPair){
          if (err) {
            return reply(err);
          } else if (!keyPair) {
            return reply("No credential stored in backend").code(401);
          } else {
            var privateKey = forge.pki.privateKeyFromPem(keyPair.privateKey);
            model().findOne({publicKey : request.headers.token}).select().lean().exec(function(err, result) {
              if (err) {
                return reply(err);
              } else if (!keyPair) {
                return reply("No credential stored in backend").code(401);
              } else {
                // Create credential object
                var credential = {
                  user : result.username,
                  host : result.imapHost,
                  port : result.imapPort,
                  tls : result.imapTLS
                }
                // Dercypt the password
                console.log("decrypt password");
                credential.password = privateKey.decrypt(result.password);
  
                createPool(request, reply, credential, function(client){
                  // Recall to extend expiry time
                  var client = pool.get(id);
                  console.log("connecting");
                  client.connect()
                    .then(function(){
                      realFunc(client, request, reply);
                    })
                    .catch(function(err){
                      if (err) {
                        return reply({err : err.message}).code(500);
                      } else {
                        var err = new Error("Fail to connect");
                        return reply({err : err.message}).code(500);
                      }
                    })
                });
              }
            })
          }
        })
      } else {
        // Pool doesn't exists and there is no token in request header.
        // This must be a login request, create new pool and connect/auth.
        console.log("client does not have token");
        console.log(request.payload);
        if (!request.payload.username
        || !request.payload.password
        || !request.payload.imapHost
        || !request.payload.imapPort
        || !request.payload.imapTLS
        || !request.payload.smtpHost
        || !request.payload.smtpPort
        || !request.payload.smtpTLS
        || !request.payload.smtpSecure
        ) {
          var err = new Error("Credential and IMAP/SMTP configuration needed");
          return reply({err : err.message}).code(500);
        }

        if (config.imap.host) {
            request.payload.imapHost = config.imap.host;
        }

        if (config.imap.port) {
            request.payload.imapPort = config.imap.port;
        }

        if (config.smtp.host) {
            request.payload.smtpHost = config.smtp.host;
        }

        if (config.smtp.port) {
            request.payload.smtpPort = config.smtp.port;
        }

        var credential = {
          user : request.payload.username,
          password : request.payload.password,
          host : request.payload.imapHost,
          port : request.payload.imapPort,
          tls : request.payload.imapTLS
        }
        createPool(request, reply, credential, function(client){
          // Recall to extend expiry time
          var client = pool.get(credential.user);
          // Make connection to IMAP server
          console.log("connecting");
          client.connect()
            .then(function(){
              console.log("Successfully connect");
              console.log("Connection ready");
              // create key pair to encrypt password
              console.log("generating key pair");
              var keys = forge.pki.rsa.generateKeyPair({bits:1024});
              var publicKey = keys.publicKey;
        
              // Save key pair to db
              var keyPair = {}
              var publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
              // Public key need to be decaded to base64 for easy query later
              keyPair.publicKey = forge.util.encode64(forge.pem.decode(publicKeyPem)[0].body);
              // And private key stay in PEM format
                console.log("private key to pem");
              keyPair.privateKey = forge.pki.privateKeyToPem(keys.privateKey);
                console.log("save to db");
              keyModel().create(keyPair, function(err, result){
                if (err) {
                  return reject(err);
                }
                // Encrypt password and save the credential to db
                console.log("encrypt");
                request.payload.password = publicKey.encrypt(request.payload.password);
                request.payload.publicKey = keyPair.publicKey;
                model().create(request.payload, function(err, result){
                  console.log(err);
                  console.log(result);
                  if (err) {
                    return reject(err);
                  }
                  pool.map[credential.user].obj.publicKey = keyPair.publicKey;
                  realFunc(client, request, reply);
                })
              })
            })
            .catch(function(err){
              if (err) {
                if (err.message == "Invalid credentials (Failure)") {
                  return reply({err : err.message}).code(401);
                }
                return reply({err : err.message}).code(500);
              } else {
                var err = new Error("Fail to connect");
                return reply({err : err.message}).code(500);
              }
            })
        });
      }
    }
  })
}

/**
 * Remove credential and token in server side
 *
 */

ImapAPI.prototype.logout = function(request, reply) {
  if (!request.headers.token || !request.headers.username) {
    var err = new Error("Token needed");
    return reply({err : err.message}).code(500);
  }
  var pool = Pool.getInstance();
  if (pool.map[request.headers.username]) {
    pool.map[request.headers.username].expire = (new Date()).valueOf() - 10000;
    pool.destroy();
  }
  model().remove({publicKey : request.headers.token}).lean().exec(function(){
    keyModel().remove({publicKey : request.headers.token}).lean().exec(function(){
      reply();
    });
  });
}

/**
 * Connect to IMAP server
 *
 */
ImapAPI.prototype.auth = function(request, reply) {
  var realFunc = function(client, request, reply) {
    reply({token: client.publicKey });
  }
  checkPool(request, reply, realFunc)
}

/**
 * Get messages' header from mail box
 *
 */
ImapAPI.prototype.listBox = function(request, reply) {
  var realFunc = function(client, request, reply) {
    console.log(request.query.boxName);
    if (!request.query.boxName || request.query.boxName == undefined) {
      var err = new Error("Missing query parameter : boxName");
      return reply({err : err.message}).code(500);
    }
    client.listBox(request.query.boxName)
      .then(function(result){
        reply(result);
      })
      .catch(function(err){
        reply({err : err.message}).code(500);
      })
  }
  checkPool(request, reply, realFunc);
}

/**
 * Get mail boxes
 *
 */
ImapAPI.prototype.getBoxes = function(request, reply) {
  
  var realFunc = function(client, request, reply) {
    client.getBoxes()
      .then(function(boxes){
        console.log(boxes);
        // Circular object, need to be simplified
        var boxes = Object.keys(boxes);
        reply(boxes);
      })
      .catch(function(err){
        console.log(err);
        reply(err);
      })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Get special boxes and its path ( tools.ietf.org/html/rfc6154#page-3 )
 *
 */
ImapAPI.prototype.getSpecialBoxes = function(request, reply) {

  var realFunc = function(client, request, reply) {
    client.getSpecialBoxes()
      .then(function(specials){
        reply(specials);
      })
      .catch(function(err){
        return reply(err);
      })
  }

  checkPool(request, reply, realFunc);
}


/**
 * Add new mail box
 *
 */
ImapAPI.prototype.addBox = function(request, reply) {
  var realFunc = function(client, request, reply) {
    console.log(request.query.boxName);
    client.createBox(request.query.boxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
        console.log(err.message);
        reply({err : err.message}).code(500);
      })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Remove a mail box
 *
 */
ImapAPI.prototype.removeBox = function(request, reply) {
  var realFunc = function(client, request, reply) {
    console.log(request.query.boxName);
    client.removeBox(request.query.boxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
        console.log(err.message);
        reply({err : err.message}).code(500);
      })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Rename a mail box
 *
 */
ImapAPI.prototype.renameBox = function(request, reply) {
  var realFunc = function(client, request, reply) {
    console.log(request.query.boxName);
    client.renameBox(request.query.boxName, request.query.newBoxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
        console.log(err.message);
        reply({err : err.message}).code(500);
      })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Retrieve message by Id
 *
 */
ImapAPI.prototype.retrieveMessage = function(request, reply) {
  var realFunc = function(client, request, reply) {
    console.log(request.query);
    client.retrieveMessage(request.query.id, request.query.boxName)
      .then(function(message){
        reply(message);
      })
      .catch(function(err){
        console.log(err.message);
        reply({err : err.message}).code(500);
      })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Move message to another mail box
 *
 */
ImapAPI.prototype.moveMessage = function(request, reply) {
  var realFunc = function(client, request, reply) {
    client.moveMessage(request.query.id, request.query.boxName, request.query.newBoxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
        console.log(err.message);
        reply({err : err.message}).code(500);
      })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Remove message ( flag it as "Deleted" and move to "Trash" box )
 *
 */
ImapAPI.prototype.removeMessage = function(request, reply) {
  var realFunc = function(client, request, reply) {
    console.log(request.query.id);
    console.log(request.query.boxName);
    client.removeMessage(request.query.id, request.query.boxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
        console.log(err.message);
        reply({err : err.message}).code(500);
      })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Create new message draft and save it to Draft box
 *
 */
ImapAPI.prototype.newMessage = function(request, reply) {
  var realFunc = function(client, request, reply) {
    var recipients = request.payload.recipients.split(";");
    var msg = {
      from : request.payload.from,
      to : recipients,
      sender : request.payload.sender,
      subject : request.payload.subject,
      text : request.payload.text
    }
    var newMessage = composer(msg);
    newMessage.build(function(err, message){
      client.newMessage(message)
        .then(function(){
          reply();
        })
        .catch(function(err){
          console.log(err.message);
          reply({err : err.message}).code(500);
        })
    })
  }
  
  checkPool(request, reply, realFunc);
}

// Model
var model = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("Auth");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = {
    username: String,
    password: String,
    imapHost : String,
    imapPort : Number,
    imapTLS : Boolean,
    smtpHost : String,
    smtpPort : Number,
    smtpTLS : Boolean,
    smtpSecure : Boolean,
    publicKey : String
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("Auth", s);
  return m;

}

var keyModel = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("KeyPair");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = {
    publicKey : String,
    privateKey : String,
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("KeyPair", s);
  return m;

}

exports.model = model;

exports.register = function(server, options, next) {
  new ImapAPI(server, options, next);
  next();
};

exports.register.attributes = {
  pkg: require("./package.json")
};

exports.module = {
  IMAP : IMAP,
  SMTP : SMTP
};
