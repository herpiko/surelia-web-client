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
            progress : Joi.string(),
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
          content : Joi.string().required(),
        }  
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
            progress : Joi.string(),
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
                obj.msg.attachments = [];
                // Check for attachmentId,
                // if any, grab them from temporary attachment collection
                async.eachSeries(payload.attachments, function(attachment, cb){
                  uploadAttachmentModel().findOne({_id : attachment.attachmentId})
                    .exec(function(err, result){
                      if (err) {
                        return reply(err).code(500);
                      } 
                      if (!result) {
                        return reply(new Error("Attachments not found").message).code(500);
                      }
                      attachment.content = result.content;
                      delete(attachment.progress);
                      obj.msg.attachments.push(attachment);
                      // Remove temporary attachment, but do not wait
                      uploadAttachmentModel().remove({_id : attachment.attachmentId});
                      cb(); 
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
    // Check if the pool is exist
    if (pool.map[id]) {
      if (pool.map[id].obj.client.state == "disconnected") {
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
    } else {
      if (request.headers.token) {
        // Pool doesn't exists, Check if there is a token in request header.
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
      } else {
        // Pool doesn't exists and there is no token in request header.
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
              // Public key need to be decaded to base64 for easy query later
              keyPair.publicKey = forge.util.encode64(forge.pem.decode(publicKeyPem)[0].body);
              // And private key stay in PEM format
              keyPair.privateKey = forge.pki.privateKeyToPem(keys.privateKey);
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
                if ( err.message == "Invalid credentials (Failure)"
                  || err.message.indexOf("Lookup failed") > -1
                  || err.type.toLowerCase() == "no" 
                  || err.type.toLowerCase() == "bad" 
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
    if (!request.query.boxName || request.query.boxName == undefined) {
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
    client.listBox(request.query.boxName, request.query.limit, request.query.page, opts)
      .then(function(result){
        reply(result);
      })
      .catch(function(err){
        if (err && err.message && err.message == "Nothing to fetch") {
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
        // Save attachments to uploadAttachment collection in purpose of drafts and forward
        async.eachSeries(message.parsed.attachments, function(attachment, cb){
          var a = {
            content : attachment.content.toString("base64"),
            timestamp : new Date()
          }
          uploadAttachmentModel().create(a, function(err, result){
            if (err) {
              return reply(err).code(500);
            }
            // This attachmentId is used to refetch attachments from db if the message is going to send
            attachment.attachmentId = result._id;
            cb();
          })
        }, function(err){
          if (err) {
            return reply({err : err.message}).code(500);
          }
          // Cut and save attachments to attachment collection in purpose of separated attachment download.
          var attachments = {
            attachments : message.parsed.attachments,
            messageId : message.parsed.messageId,
          }
  
          // First, check if there is existing attachment in db
          attachmentModel().find({messageId : message.parsed.messageId}).exec(function(err, result){
            if (err) {
              return reply(err).code(500);
            }
            if (result && result.length == 0) {
              attachmentModel().create(attachments, function(err, result){
                if (err) {
                  return reply(err).code(500);
                }
                for (var i = 0; i < message.parsed.attachments.length;i++) {
                  // Remove the attachment content
                  message.parsed.attachments[i].content = "";
                }
                reply(message);
              })
            } else {
              reply(message);
            }
          })
        }) 
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
    client.moveMessage(request.query.id, request.query.boxName, request.query.newBoxName)
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
    client.removeMessage(request.query.seq, request.query.boxName)
      .then(function(){
        attachmentModel().remove({messageId : decodeURIComponent(request.query.messageId)}).exec();
        // Do not wait
        reply().code(200);
      })
      .catch(function(err){
        reply({err : err.message}).code(500);
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
    attachmentModel().findOne({ messageId : request.query.messageId}).exec(function(err, result){
      if (err) {
        return reply(err).code(500);
      }
      if (!result){
        return reply(new Error("Attachment not found").message).code(404);
      }
      reply(result.attachments[parseInt(request.query.index)]);
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
    var attachment = {
      content : request.payload.content,
      timestamp : new Date()
    }
    uploadAttachmentModel().create(attachment, function(err, result){
      if (err) {
        return reply(err).code(500);
      }
      reply({attachmentId : result._id});
    })
  }
  
  checkPool(request, reply, realFunc);
}
ImapAPI.prototype.removeAttachment = function(request, reply) {
  var realFunc = function(client, request, reply) {
    uploadAttachmentModel().remove({_id : request.query.attachmentId}, function(err, result){
      if (err) {
        return reply(err).code(500);
      }
      reply().code(200);
    })
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
        uploadAttachmentModel().findOne({_id : attachment.attachmentId})
          .exec(function(err, result){
            if (err) {
              return reply(err).code(500);
            } 
            if (!result) {
              return reply(new Error("Attachments not found").message).code(500);
            }
            attachment.content = result.content;
            delete(attachment.progress);
            msg.attachments.push(attachment);
            // Remove temporary attachment, but do not wait
            uploadAttachmentModel().remove({_id : attachment.attachmentId});
            cb(); 
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

var attachmentModel = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("Attachment");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = {
    attachments : [],
    messageId : String,
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("Attachment", s);
  return m;
}

var uploadAttachmentModel = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("UploadAttachment");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = {
    content : String,
    timestamp : Date
  }
  var s = new mongoose.Schema(schema);
  m = mongoose.model("UploadAttachment", s);
  return m;
}

exports.model = model;

// Interval function to remove expired temporary attachment
setInterval(function(){
  uploadAttachmentModel().remove({timestamp : {$lt : moment().subtract(24, "hours")}});
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
