var mongoose = require("mongoose");
var IMAP = require("./imap");
var SMTP = require("./smtp");
var Pool = require("./pool");
var composer = require("mailcomposer");
var forge = require("node-forge");
var config = require('../../conf/prod/surelia');
var async = require("async");
var moment = require("moment");
var Joi = require("joi");
var lodash = require("lodash");
var Grid = require("gridfs-stream");
var streamifier = require("streamifier");
var base64Stream = require("base64-stream");
var objectHash = require("object-hash");
var gearmanode = require("gearmanode");
var Utils = require("./utils");
var crypto = require('crypto');
Grid.mongo = mongoose.mongo;
gfs = Grid(mongoose.connection.db);

var ImapAPI = function(server, options, next) {
  this.server = server;
  this.options = options || {};
  this.registerEndPoints();
  if (options.gearmanServer) {
    this.gearmanClient = gearmanode.client({servers : [{ host : options.gearmanServer}] })
  }
}

ImapAPI.prototype.registerEndPoints = function(){
  var self = this;
  self.server.route({
    method : "POST",
    path : "/api/1.0/send",
    handler : function(request, reply){
      self.send(request, reply);
    },
    config : {
      validate : {
        payload : {
          recipients : Joi.array().items(Joi.string().email()).required(),
          cc : Joi.array().items(Joi.string().email()).allow(""),
          bcc : Joi.array().items(Joi.string().email()).allow(""),
          from : Joi.string(),
          sender : Joi.string(),
          subject : Joi.string().allow(""),
          html : Joi.string().allow(""),
          isDraft : Joi.boolean().allow(""),
          isReply : Joi.boolean().allow(""),
          seq : Joi.number().allow(""),
          boxName : Joi.string().allow(""),
          messageId : Joi.string().allow(""),
          attachments : Joi.array().items(Joi.object().keys({
            filename : Joi.string(),
            contentType : Joi.string(),
            encoding : Joi.string(),
            progress : Joi.any(),
            attachmentId : Joi.string(),
          }))
        }  
      }
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/auth",
    handler : function(request, reply){
      self.auth(request, reply);
    },
    config : {
      validate : {
        payload : {
          username : Joi.string().email().required(),
          password : Joi.string().required(),
          imapHost : Joi.string(),
          imapPort : Joi.string(),
          imapTLS : Joi.boolean(),
          smtpHost : Joi.string(),
          smtpPort : Joi.string(),
          smtpTLS : Joi.boolean(),
          smtpSecure : Joi.boolean(),
          rememberMe : Joi.boolean(),
        }  
      }
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
    },
    config : {
      validate : {
        query : {
          boxName : Joi.string().required(),
          search : Joi.string().allow(""),
          sortBy : Joi.string().allow(""),
          sortImportance : Joi.string().allow(""),
          filter : Joi.string().allow(""),
          limit : Joi.string().allow(""),
          page : Joi.string().allow(""),
        }  
      }
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
    },
    config : {
      validate : {
        payload : {
          seqs : Joi.array().items(Joi.number()).required(),
          boxName : Joi.string().required(),
          oldBoxName : Joi.string().required(),
        }  
      }
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
  self.server.route({
    method : "GET",
    path : "/api/1.0/attachment",
    handler : function(request, reply){
      self.getAttachment(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/attachment",
    handler : function(request, reply){
      self.uploadAttachment(request, reply);
    },
    config : {
      validate : {
        payload : {
          content : Joi.required(),
        }
      },
      payload : {
        maxBytes: 16000000, 
        output : "stream",
        parse : true,
        allow : "multipart/form-data"
      }  
    }
  })
  self.server.route({
    method : "DELETE",
    path : "/api/1.0/attachment",
    handler : function(request, reply){
      self.removeAttachment(request, reply);
    }
  })
  
  self.server.route({
    method : "POST",
    path : "/api/1.0/draft",
    handler : function(request, reply){
      self.saveDraft(request, reply);
    },
    config : {
      validate : {
        payload : {
          recipients : Joi.array().items(Joi.string()).allow(""),
          cc : Joi.array().items(Joi.string()).allow(""),
          bcc : Joi.array().items(Joi.string()).allow(""),
          from : Joi.string().allow(""),
          sender : Joi.string().allow(""),
          subject : Joi.string().allow(""),
          html : Joi.string().allow(""),
          isDraft : Joi.boolean().allow(""),
          isReply : Joi.boolean().allow(""),
          boxName : Joi.string().allow(""),
          seq : Joi.number().allow(""),
          messageId : Joi.string().allow(""),
          attachments : Joi.array().items(Joi.object().keys({
            filename : Joi.string(),
            contentType : Joi.string(),
            encoding : Joi.string(),
            progress : Joi.any(),
            attachmentId : Joi.string(),
          }))
        }  
      }
    }
  })

  self.server.route({
    method : "GET",
    path : "/api/1.0/quota-info",
    handler : function(request, reply){
      self.quotaInfo(request, reply);
    }
  })
  
  self.server.route({
    method : "POST",
    path : "/api/1.0/set-flag",
    handler : function(request, reply){
      self.setFlag(request, reply);
    },
    config : {
      validate : {
        payload : {
          flag : Joi.string().required(),
          seqs : Joi.array().items(Joi.number()).required(),
          boxName : Joi.string().required(),
        }  
      }
    }
  })
  
  self.server.route({
    method : "GET",
    path : "/api/1.0/contacts",
    handler : function(request, reply){
      self.getAddressBook(request, reply);
    },
    config : {
      validate : {
        query : {
          page : Joi.number().allow(""),
          sort : Joi.string().allow(""),
          limit : Joi.number().allow(""),
          q : Joi.string().allow(""),
        }  
      }
    }
  })
  
  self.server.route({
    method : "GET",
    path : "/api/1.0/contacts/candidates",
    handler : function(request, reply){
      self.getContactCandidates(request, reply);
    }
  })
  
  self.server.route({
    method : "GET",
    path : "/api/1.0/contact",
    handler : function(request, reply){
      self.getContact(request, reply);
    },
    config : {
      validate : {
        query : {
          id : Joi.string().allow(""),
        }  
      }
    }
  })
  
  self.server.route({
    method : "DELETE",
    path : "/api/1.0/contact",
    handler : function(request, reply){
      self.deleteContact(request, reply);
    },
    config : {
      validate : {
        query : {
          id : Joi.string().required(),
        }  
      }
    }
  })
  
  self.server.route({
    method : "POST",
    path : "/api/1.0/contact",
    handler : function(request, reply){
      self.addContact(request, reply);
    },
    config : {
      validate : {
        payload : {
          emailAddress : Joi.string().required(""),
          name : Joi.string().required(""),
          organization : Joi.string().allow(""),
          name : Joi.string().allow(""),
          officeAddress : Joi.string().allow(""),
          homeAddress : Joi.string().allow(""),
          phone : [Joi.string().allow(""),Joi.number().allow("")]
        }  
      }
    }
  })
  
  self.server.route({
    method : "PUT",
    path : "/api/1.0/contact",
    handler : function(request, reply){
      self.updateContact(request, reply);
    },
    config : {
      validate : {
        payload : {
          _id : Joi.string().required(""),
          emailAddress : Joi.string().allow(""),
          name : Joi.string().allow(""),
          organization : Joi.string().allow(""),
          name : Joi.string().allow(""),
          officeAddress : Joi.string().allow(""),
          homeAddress : Joi.string().allow(""),
          phone : [Joi.string().allow(""),Joi.number().allow("")]
        }  
      }
    }
  })
  
  self.server.route({
    method : "POST",
    path : "/api/1.0/avatar",
    handler : function(request, reply){
      self.uploadAvatar(request, reply);
    },
    config : {
      validate : {
        query : {
          emailAddress : Joi.string().required(),
        },  
        payload : {
          content : Joi.required(),
        }
      },
      payload : {
        maxBytes: 32457280, 
        parse : true,
        allow : "multipart/form-data"
      }  
    }
  })
  self.server.route({
    method : "GET",
    path : "/api/1.0/avatar",
    handler : function(request, reply){
      self.getAvatar(request, reply);
    },
    config : {
      validate : {
        query : {
          emailAddress : Joi.string().required(),
        }
      }
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/settings/set-password",
    handler : function(request, reply){
      self.setPassword(request, reply);
    },
    config : {
      validate : {
        payload : {
          username : Joi.string().email().required(),
          oldPassword : Joi.string().required(),
          newPassword : Joi.string().required(),
        }  
      }
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
  var realSend = function(request, reply, smtp, obj){
    var msg = obj.msg;
    var newMessage = composer(msg)
    newMessage.build(function(err, message){
      if (err) {
        return reply({error : err.message}).code(500);
      }
      if (msg.cc) {
        msg.to = msg.to.concat(msg.cc);
      }
      if (msg.bcc) {
        msg.to = msg.to.concat(msg.bcc);
      }
      smtp.send(msg.from, msg.to, message)
        .then(function(info){
          if (info.accepted.length > 0) {
            var realFunc = function(client, request, reply) {
              // Move to Sent
              client.newMessage(message, request.query.sentPath)
              // Remove from Drafts
              if (obj.meta.seq && obj.meta.isDraft) {
                var seqs = obj.meta.seq.toString().split(",");
                client.removeMessage(obj.meta.seq, request.query.draftPath)
              }
              // Flag as answered
              if (obj.meta.seq && obj.meta.isReply && obj.meta.boxName) {
                client.addFlag(obj.meta.seq, "Answered", obj.meta.boxName);
              }
            }
            checkPool(request, reply, realFunc)
          }
          // But do not wait
          reply(info).type("application/json");
        })
        .catch(function(err){
          reply({error : err.message}).code(500);
        })
    })
  }

  if (!request.headers.token && !request.headers.username) {
    var err = new Error("Token needed");
    return reply({err : err.message}).code(500);
  }
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
          // Decrypt the password
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

          var smtp = new SMTP(options);
          smtp.connect()
            .then(function(){
              return smtp.auth(result.username, password);
            })
            .then(function(){
              var payload = request.payload;
              var msg = {
                from : payload.from,
                to : payload.recipients,
                sender : payload.sender,
                subject : payload.subject,
                html : payload.html
              }
              if (payload.bcc) {
                msg.bcc = payload.bcc;
              }
              if (payload.cc) {
                msg.cc = payload.cc;
              }
              var meta = {};
              if (request.payload.seq) {
                meta.seq = request.payload.seq;
              }
              if (request.payload.isDraft) {
                meta.isDraft = request.payload.isDraft;
              }
              if (request.payload.isReply) {
                meta.isReply = request.payload.isReply;
              }
              if (request.payload.boxName) {
                meta.boxName = request.payload.boxName;
              }
              // Wrap msg and meta to object
              var obj = {
                msg : msg,
                meta : meta
              }
              if (payload.attachments && payload.attachments.length > 0) {
                // grab them from temporary attachment collection
                obj.msg.attachments = [];
                async.eachSeries(payload.attachments, function(attachment, cb){
                  // Check for attachmentId,
                  gfs.exist({_id : attachment.attachmentId}, function(err, isExist){
                    if (err) {
                      return reply(err).code(500);
                    }
                    if (!isExist) {
                      var err = new Error("Attachment not found");
                      return reply({err : err.message}).code(500);
                    }
                    var file = gfs.createReadStream({ _id : attachment.attachmentId }).pipe(base64Stream.encode());
                    var string = "";
                    file.on("error", function(err){
                      return reply(err).code(500);
                    })
                    file.on("data", function(chunk){
                      string += chunk.toString('utf8');
                    })
                    file.on("end", function(){
                      attachment.content = string;
                      attachment.encoding = "base64";
                      delete(attachment.progress);
                      obj.msg.attachments.push(attachment);
                      // Remove temporary attachment
                      gfs.files.remove({_id : attachment.attachmentId});
                      // But do not wait
                      cb(); 
                    })
                  })
                }, function(err){
                  realSend(request, reply, smtp, obj);
                })
              } else {
                realSend(request, reply, smtp, obj);
              }
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
    var id = request.headers.username;
    // Check session expiration, return err if expired
    var checkExpiry = function(request, cb) {
      keyModel().findOne({publicKey : request.headers.token}, function(err, keyPair){
          if (err) {
            return cb(err);
          }
          if (!keyPair) {
            return cb(new Error("Session expired"));
          }
          var now = moment();
          if (moment(keyPair.sessionExpiry) > now) {
            if (moment(keyPair.sessionExpiry) < moment().add(1, "h")) {
              keyPair.sessionExpiry = moment().add(1, "h");
              keyPair.save();
            }
            // Do not wait
            return cb();
          } else {
            return cb();
          }
      })
    }
    // Check if the pool is exists
    if (pool.map[id]) {
      checkExpiry(request, function(err){
        if (err) {
          return clearCredentials(request, function(){
            reply({err :err.message}).code(401);
          })
        }
        if (pool.map[id].obj.client.state === "disconnected") {
          var client = pool.get(id);
          client.connect()
            .then(function(){
              realFunc(client, request, reply);
            })
            .catch(function(err){
              return reply({err : err.message}).code(500);
            })
        } else {
          // Execute real function
          realFunc(pool.map[id].obj, request, reply);
        }
      })
    } else {
      if (request.headers.token) {
        checkExpiry(request, function(err){
          if (err) {
            return clearCredentials(request, function(){
              reply({err : err.message}).code(401);
            })
          }
          // Pool doesn't exist, but there is a token in request header.
          // This token is a public key that will be used to 
          // encrypt credential password which has been stored in db
          // Get the public key's pair (private key) in purpose to decrypt password
          keyModel().findOne({publicKey : request.headers.token})
            .select()
            .lean()
            .exec(function(err, keyPair){
              if (err) {
                return reply(err);
              } else if (!keyPair) {
                return reply("No credential stored in backend").code(401);
              } else {
                var privateKey = forge.pki.privateKeyFromPem(keyPair.privateKey);
                model().findOne({publicKey : request.headers.token})
                  .select()
                  .lean()
                  .exec(function(err, result) {
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
                      credential.password = privateKey.decrypt(result.password);
        
                      createPool(request, reply, credential, function(client){
                        // Recall to extend expiry time
                        var client = pool.get(id);
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
        });
      } else {
        // Pool doesn't exist and there is no token in request header.
        // This must be a login request, create new pool and connect/auth.
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
        if (pool.map[request.payload.username]) {
          pool.map[request.payload.username].expire = (new Date()).valueOf() - 10000;
          pool.destroy();
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
          client.connect()
            .then(function(){
              // create key pair to encrypt password
              var keys = forge.pki.rsa.generateKeyPair({bits:1024});
              var publicKey = keys.publicKey;
        
              // Save key pair to db
              var keyPair = {}
              var publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
              // Public key need to be decoded to base64 for easy query later
              keyPair.publicKey = forge.util.encode64(forge.pem.decode(publicKeyPem)[0].body);
              // And private key stays in PEM format
              keyPair.privateKey = forge.pki.privateKeyToPem(keys.privateKey);
              // Set session expiration
              if (request.payload.rememberMe) {
                keyPair.sessionExpiry = moment().add(7, "d");
              } else {
                keyPair.sessionExpiry = moment().add(1, "h");
              }
              keyModel().create(keyPair, function(err, result){
                if (err) {
                  return reject(err);
                }
                // Encrypt password and save the credential to db
                request.payload.password = publicKey.encrypt(request.payload.password);
                request.payload.publicKey = keyPair.publicKey;
                model().create(request.payload, function(err, result){
                  if (err) {
                    return reject(err);
                  }
                  pool.map[credential.user].obj.publicKey = keyPair.publicKey;
                  realFunc(client, request, reply);
                })
              })
            })
            .catch(function(err){
              pool.map[credential.user].expire = (new Date()).valueOf() - 10000;
              pool.destroy();
              if (err) {
                if ( err.message === "Invalid credentials (Failure)"
                  || err.message.indexOf("Lookup failed") > -1
                  || err.type.toLowerCase() === "no" 
                  || err.type.toLowerCase() === "bad" 
                ) {
                   var err = new Error("Invalid credentials")
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

var clearCredentials = function(request, cb) {
  var pool = Pool.getInstance();
  if (request.headers.username && pool.map[request.headers.username]) {
    pool.map[request.headers.username].expire = (new Date()).valueOf() - 10000;
    pool.destroy();
  }
  // Do not catch error, just go on
  if (request.headers.token) {
    model().remove({publicKey : request.headers.token}).lean().exec();
    keyModel().remove({publicKey : request.headers.token}).lean().exec();
  }
  cb();
}

ImapAPI.prototype.logout = function(request, reply) {
  if (!request.headers.token || !request.headers.username) {
    var err = new Error("Token needed");
    return reply({err : err.message}).code(500);
  }
  clearCredentials(request, function(){
    reply()
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
    if (!request.query.boxName || request.query.boxName === undefined) {
      var err = new Error("Missing query parameter : boxName");
      return reply({err : err.message}).code(500);
    }
    var opts = {}
    if (request.query.search) {
      opts.search = request.query.search;
    }
    if (request.query.sortBy) {
      opts.sortBy = request.query.sortBy;
    }
    if (request.query.sortImportance) {
      opts.sortImportance = request.query.sortImportance;
    }
    if (request.query.filter) {
      opts.filter = request.query.filter;
    }
    client.listBox(request.query.boxName, request.query.limit, request.query.page, opts)
      .then(function(result){

        reply(result);

        // Collect email address to addressBook
        // Since this collector is a heavy process, make it async

        var collectEmails = function(addressArray) {
          return new Promise(function(resolve, reject){
            if (addressArray && addressArray.length > 0) {
              // Fast async document creation could make duplicated items
              // Let's process it one by one
              async.eachSeries(addressArray, function(email, cb){
                // Check if the email address exists in db
                addressBookModel().findOne({emailAddress:email.address, account : request.headers.username}, function(err, result){
                  if (result){
                    return cb();
                  }
                  deletedContactModel().findOne({emailAddress:email.address, account : request.headers.username}, function(err, result){
                    if (result) {
                      return cb();
                    }
                    email.name = email.name || "";
                    addressBookModel().create({emailAddress : email.address, name : email.name, account : request.headers.username}, function(err){ 
                      cb();
                    });
                  })
                })
              }, function(err){
                resolve();
              })
            } else {
              resolve();
            }
          })
        }

        // Iterate the message list
        // Fast async document creation could make duplicated items
        // Let's process it one by one
        // In this deep function, Do not check for errors
        async.eachSeries(result.data, function(message, cb){
          var hash = objectHash(message.parsed.headers);
          collectedMessageModel().findOne({hash : hash}, function(err, result){
            if (!result){
              // Collect them all!
              collectEmails(message.parsed.cc)
                .then(function(){
                  return collectEmails(message.parsed.from);
                })
                .then(function(){
                  return collectEmails(message.parsed.to);
                })
                .then(function(){
                  // Save the new message hash
                  collectedMessageModel().create({hash : hash}, function(err, result){ 
                    cb();
                  })
                })
                .catch(function(err){
                  cb();
                })
            } else {
              cb();
            }
          })
        }, function(err){
          // Do nothing. All is well.
        })
      })
      .catch(function(err){
        if (err && err.message && err.message === "Nothing to fetch") {
          return reply({err : err.message}).code(404);
        }
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
        reply(boxes);
      })
      .catch(function(err){
        reply(err.message);
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
        return reply(err.message);
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
    client.createBox(request.query.boxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
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
    client.removeBox(request.query.boxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
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
    client.renameBox(request.query.boxName, request.query.newBoxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
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
    client.retrieveMessage(request.query.id, request.query.boxName)
      .then(function(message){
        delete(message.original);
        if (request.query.boxName.indexOf("Drafts") > -1) {
          message.isDraft = true;
        }

        if (!message.hasAttachments && !message.parsed.attachments) {
          return reply(message);
        }
        reply(message);
      })
      .catch(function(err){
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
    client.moveMessage(request.payload.seqs, request.payload.oldBoxName, request.payload.boxName)
      .then(function(){
        reply();
      })
      .catch(function(err){
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
    var opts = {};
    var seqs = request.query.seqs.split(",");
    async.eachSeries(seqs, function(seq, cb){
      seqs[seqs.indexOf(seq)] = parseInt(seq);
      cb();
    }, function(){
      opts.archive = (request.query.archive && request.query.archive === true) ? true : false;
      client.removeMessage(seqs, request.query.boxName, opts)
        .then(function(){
          gfs.files.remove({ filename : decodeURIComponent(request.query.messageId) });
          // Do not wait
          reply().code(200);
        })
        .catch(function(err){
          reply({err : err.message}).code(500);
        })
    })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Get attachment of a message
 *
 */
ImapAPI.prototype.getAttachment = function(request, reply) {
  var realFunc = function(client, request, reply) {
    gfs.findOne({_id : request.query.attachmentId}, function(err, isExist) {
      if (err) {
        return reply(err).code(500);
      }
      if (!isExist) {
        return reply({err : new Error("Attachment not found").message}).code(404);
      }
      var file = gfs.createReadStream({ _id : request.query.attachmentId });
      var decipher = crypto.createDecipher('aes192', request.query.key.toString());
      reply(file.pipe(decipher));
    })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Upload attachment during compose in client side
 *
 */
ImapAPI.prototype.uploadAttachment = function(request, reply) {
  var realFunc = function(client, request, reply) {
    var id = mongoose.Types.ObjectId();
    var writeStream = gfs.createWriteStream({
      _id : id,
      filename : request.payload.content.hapi.filename
    });
    writeStream.on("finish", function(){
      reply({attachmentId : id});
    });
    writeStream.on("error", function(err){
      reply(err);
    });
    request.payload.content.pipe(writeStream);
  }
  
  checkPool(request, reply, realFunc);
}

ImapAPI.prototype.removeAttachment = function(request, reply) {
  var realFunc = function(client, request, reply) {
    gfs.files.remove({_id : request.query.attachmentId});
    // Async
    reply().code(200);
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Create new message draft and save it to Draft box
 *
 */
ImapAPI.prototype.saveDraft = function(request, reply) {
  var realSaveDraft = function(request, reply, client, msg) {
    var newMessage = composer(msg);
    newMessage.build(function(err, message){
      if (err) {
        reply({err : err.message}).code(500);
      }
      client.newMessage(message, request.query.draftPath)
        .then(function(){
          reply();
        })
        .catch(function(err){
          reply({err : err.message}).code(500);
        })
    })
  }
  
  var realFunc = function(client, request, reply) {
    var msg = {
      from : request.payload.from,
      to : request.payload.recipients,
      sender : request.payload.sender,
      subject : request.payload.subject,
      html : request.payload.html
    }
    if (request.payload.bcc) {
      msg.bcc = request.payload.bcc;
    }
    if (request.payload.cc) {
      msg.cc = request.payload.cc;
    }
    if (request.payload.attachments && request.payload.attachments.length > 0) {
      msg.attachments = [];
      // Check for attachmentId,
      // if any, grab them from temporary attachment collection
      async.eachSeries(request.payload.attachments, function(attachment, cb){
        gfs.exist({_id : attachment.attachmentId}, function(err, isExist){
          if (err) {
            return reply(err).code(500);
          }
          if (!isExist) {
            var err = new Error("Attachment not found");
            return reply({err : err.message}).code(500);
          }
          file = gfs.createReadStream({ _id : attachment.attachmentId });
          var string = "";
          file.on("error", function(err){
            return reply(err).code(500);
          })
          file.on("data", function(chunk){
            string += chunk;
          })
          file.on("end", function(){
            attachment.content = string;
            attachment.encoding = "base64";
            delete(attachment.progress);
            msg.attachments.push(attachment);
            // Remove temporary attachment
            gfs.files.remove({_id : attachment.attachmentId});
            // But do not wait
            cb(); 
          })
        })
      }, function(err){
        realSaveDraft(request, reply, client, msg);
      })
    } else {
      realSaveDraft(request, reply, client, msg);
    }
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Gets quota information
 */
ImapAPI.prototype.quotaInfo = function(request, reply) {
  var realFunc = function(client, request, reply) {
    client.quotaInfo()
      .then(function(info){
        reply(info);
      })
    .catch(function(err){
      reply({err : err.message}).code(500);
    })
  }

  checkPool(request, reply, realFunc);
}

ImapAPI.prototype.setFlag = function(request, reply) {
  var realFunc = function(client, request, reply) {
    if (request.payload.flag.toUpperCase() === "UNREAD") {
      return client.removeFlag(request.payload.seqs, "Seen", request.payload.boxName)
        .then(function(){
          reply(); 
        })
        .catch(function(err){
          reply({err : err.message}).code(500);
        })
    }
    if (request.payload.flag.toUpperCase() === "READ") {
      return client.addFlag(request.payload.seqs, "Seen", request.payload.boxName)
        .then(function(){
          reply(); 
        })
        .catch(function(err){
          reply({err : err.message}).code(500);
        })
    }
  }
  
  checkPool(request, reply, realFunc);
}

// Address Book CRUD

/**
 * Get all the address book collection for autocomplete
 */
ImapAPI.prototype.getContactCandidates = function(request, reply) {
  var realFunc = function(client, request, reply) {
    addressBookModel().find({account : request.headers.username}).select({name:1, emailAddress:1}).exec(function(err, result){
      if (err) {
        return reply(err).code(500);
      }
      reply(result);
    })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Get the address book collection, per page and limit
 */
ImapAPI.prototype.getAddressBook = function(request, reply) {
  var realFunc = function(client, request, reply) {

    var defaultLimit = 10;
    var sort = { emailAddress : 1 };
  
    var query = {
      account : request.headers.username
    };
    var limit = request.query.limit || defaultLimit;
    var page = request.query.page || 1;
    if (request.query.q) {
      query = {
        emailAddress: new RegExp(request.query.q, "i")
      }
    }
    if (request.query.sort) {
      if (request.query.sort == "ascending") {
        sort.emailAddress = 1;
      } else if (request.query.sort == "descending") {
        sort.emailAddress = -1;
      }
    }

    // Count all records first
    addressBookModel().count(query, function(err, count) {
      if (err) {
        return reply(err);
      }
  
      var q = addressBookModel()
        .find(query)
        .sort(sort)
        .lean();
  
      var numPages = 1; 
      q.limit(limit);
      q.skip(limit * (page - 1));
      numPages =  Math.ceil(count/limit);
  
      q.exec(function(err, result) {
        if (err) {
          return reply(err).code(500);
        }
        reply({
          meta : {
            limit : limit,
            total: count,
            pages: numPages,
            page: page,
          },
          data: result
        });
      });
    });
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Get a contact
 */
ImapAPI.prototype.getContact = function(request, reply) {
  var realFunc = function(client, request, reply) {
    addressBookModel().findOne({_id:request.query.id})
      .select({
        name : 1, 
        emailAddress : 1,
        officeAddress : 1,
        organization : 1,
        homeAddress : 1,
        phone : 1,
        avatarId : 1,
        _id : 1,
      })
      .exec(function(err, result){
        if (err) {
          return reply(err).code(500);
        }
        if (!result) {
          return reply({err : "Contact not found"}).code(404);
        }
        reply(result);
    })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Add new contact
 */
ImapAPI.prototype.addContact = function(request, reply) {
  var realFunc = function(client, request, reply) {
    request.payload.account = request.headers.username;
    deletedContactModel().remove({emailAddress : request.payload.emailAddress}, function(err, result){
      // Ignore error. If it doesn't exist, go on.
      addressBookModel().find({emailAddress : request.payload.emailAddress}, function(err, result){
        if (err) {
          return reply(err).code(500);
        }
        if (result.length > 0) {
          return reply({err :new Error("Contact already exists").message}).code(422);
        }
        addressBookModel().create(request.payload, function(err, result){
          if (err) {
            return reply(err).code(500);
          }
          reply(result);
        })
      })
    })

  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Update existing contact
 */
ImapAPI.prototype.updateContact = function(request, reply) {
  var self = this;
  var realFunc = function(client, request, reply) {
    var id = request.payload._id;
    delete(request.payload._id);
    addressBookModel().findOneAndUpdate({_id:id}, request.payload, function(err, result){
      if (err) {
        return reply(err).code(500);
      }
      addressBookModel().findOne({_id:id}).exec(function(err, result){
        if (err) {
          return reply(err).code(500);
        }
        reply(result);
      })
    })
  }
  checkPool(request, reply, realFunc);
}

/**
 * Delete existing contact
 */
ImapAPI.prototype.deleteContact = function(request, reply) {
  var self = this;
  var realFunc = function(client, request, reply) {
    var ids = request.query.id.split(",");
    async.eachSeries(ids, function(id, cb){
      var emailAddress;
      addressBookModel().findOne({_id:id}).exec(function(err, result){
        if (err) {
          return cb(err);
        }
        if (!result) {
          return cb({err : "Contact not found"});
        }
        emailAddress = result.emailAddress;
        addressBookModel().remove({_id:id}, function(err, result){
          if (err) {
            return cb(err);
          }
          deletedContactModel().create({
            emailAddress : emailAddress,
            account : request.headers.username
          }, function(err, result){
            if (err) {
              return cb(err);
            }
            cb();
          })
        })
      })
    }, function(err){
      if (err) {
        return reply(err).code(500);
      }
      reply();
    })
  }
  checkPool(request, reply, realFunc);
}


/**
 * Upload avatar
 *
 */
ImapAPI.prototype.uploadAvatar = function(request, reply) {
  var realFunc = function(client, request, reply) {
    // There are probability of duplicated contact on different account,
    // Then, query by email address only isn't appropriate.
    // So does the avatarId, because it doesn't included in listBox result. 
    // Combined hash of current username
    // and the contact email address is used both as filename and query key
    var hash = objectHash(request.headers.username + request.query.emailAddress);
    fsModel().remove({filename : hash}, function(err, result){
      // Ignore error
      var id = mongoose.Types.ObjectId();
      var writeStream = gfs.createWriteStream({
        _id : id,
        filename : hash,
        meta : {
          emailAddress : request.query.emailAddress,
        }
      });
      writeStream.on("finish", function(){
        addressBookModel()
          .findOneAndUpdate({emailAddress : request.query.emailAddress}, {avatarId : id}, function(err, result){
            if (err) {
              return reply(err).code(500);
            }
            reply({avatarId : id}).code(200);
          }) 
      });
      writeStream.on("error", function(err){
        reply(err).code(500);
      });
      var readableStreamBuffer = streamifier.createReadStream(request.payload.content);
      readableStreamBuffer.pipe(writeStream);
    });
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Get avatar
 *
 */
ImapAPI.prototype.getAvatar = function(request, reply) {
  var realFunc = function(client, request, reply) {
    var hash = objectHash(request.headers.username + request.query.emailAddress);
    gfs.exist({filename : hash}, function(err, isExist) {
      if (err) {
        return reply(err).code(500);
      }
      if (!isExist) {
        return reply("").code(200);
      }
      var file = gfs.createReadStream({ filename : hash });
      var string = "";
      file.on("error", function(err){
        return reply(err).code(500);
      })
      file.on("data", function(chunk){
        string += chunk;
      })
      file.on("end", function(){
        reply(string).code(200);
      })
    })
  }
  
  checkPool(request, reply, realFunc);
}

/**
 * Set new password 
 * @param {String} username - Email address
 * @param {String} oldPassword - Old password
 * @param {String} newPassword - New password
 */

ImapAPI.prototype.setPassword = function(request, reply) {
  var self = this;
  var realFunc = function(client, request, reply) {
    if (!self.gearmanClient) {
      return reply({"err":"Set password feature is not supported"}).code(500);
    }
    var params = JSON.stringify({
      username : request.payload.username,
      oldPassword : request.payload.oldPassword,
      newPassword : request.payload.newPassword
    })
    var job = self.gearmanClient.submitJob("setPassword", params)
    job.on("complete", function(){
      reply(job.response);
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
    publicKey : String,
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("Auth", s);
  return m;
}

// If a messageId has been stored to this collection
// it means all the email address in those message has been
// collected in addressBook collection
var collectedMessageModel = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("collectedMessage");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = {
    hash: String,
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("collectedMessage", s);
  return m;
}

// If a contact got deleted, the email address should be stored here
// So, email fetcher will ignore all contacts in this collection
var deletedContactModel = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("deletedContact");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = {
    emailAddress: String,
    account : String,
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("deletedContact", s);
  return m;
}

// Email address collection
var addressBookModel = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("addressBook");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = {
    account : String,
    emailAddress : String,
    name : String,
    organization : String,
    officeAddress : String,
    homeAddress : String,
    phone : String,
    avatarId : String,
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("addressBook", s);
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
    sessionExpiry : Date
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("KeyPair", s);
  return m;
}
var fsModel = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("fs.file");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = { any : {} }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("fs.file", s);
  return m;
}

exports.model = model;

// Interval function to remove expired temporary attachment
setInterval(function(){
  fsModel().remove({uploadDate : {$lt : moment().subtract(24, "hours")}});
}, 10000)

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
