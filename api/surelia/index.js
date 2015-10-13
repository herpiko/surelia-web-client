var mongoose = require("mongoose");
var Imap = require("./imap");
var SMTP = require("./smtp");
var Pool = require("./pool");
var composer = require("mailcomposer");
var forge = require("node-forge");


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
    path : "/api/1.0/connect",
    handler : function(request, reply){
      self.connect(request, reply);
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
    method : "POST",
    path : "/api/1.0/special-boxes",
    handler : function(request, reply){
      self.getSpecialBoxes(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/boxes",
    handler : function(request, reply){
      self.getBoxes(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/list-box",
    handler : function(request, reply){
      self.listBox(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/add-box",
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
    method : "POST",
    path : "/api/1.0/delete-box",
    handler : function(request, reply){
      self.renameBox(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/retrieve",
    handler : function(request, reply){
      self.retrieveMessage(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/move",
    handler : function(request, reply){
      self.renameBox(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/remove",
    handler : function(request, reply){
      self.renameBox(request, reply);
    }
  })
  self.server.route({
    method : "POST",
    path : "/api/1.0/new-draft",
    handler : function(request, reply){
      self.renameBox(request, reply);
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
  var payload = request.payload;
  // Mandatory option
  var options = {
    host : payload.host,
    port : payload.port,
  }
  if (payload.requireTLS) {
    options.requireTLS = true;
  }
  if (payload.secure) {
    options.secure = true;
  }
  var client = new SMTP(options);
  client.connect()
    .then(function(){
      return client.auth(payload.username, payload.password) 
    })
    .then(function(){
      var recipients = payload.recipients.split(";");
      var newMessage = composer({
        from : payload.from,
        to : recipients,
        sender : payload.sender,
        subject : payload.subject,
        text : payload.text

      })
      newMessage.build(function(err, message){
        client.send(payload.sender, payload.recipients, message)
          .then(function(info){
            reply(info).type("application/json");
          })
          .catch(function(err){
            reply({success : false, error : err});
          })
      })
    })
    .catch(function(err){
      reply({success : false, error : err});
    })
}

var createPool = function(request, reply, credential, callback){
  var pool = Pool.getInstance();
  console.log("credential to initiate new Imap instance");
  console.log(credential);
  var imap = new Imap(credential);
  var createFunc = function(){
    return imap.connect;
  }
  var id = request.payload.username || request.headers.username;
  try {
    var client = pool.get(id, null, createFunc, imap.end);
  } catch (err) {
    if (err) {
      return reply(err);
    }
  }
  pool.map[id].obj = imap;
  callback(imap);
}

var checkPool = function(request, reply, realFunc) {
  return new Promise(function(resolve, reject){
    var pool = Pool.getInstance();
    console.log("pool map");
    console.log(Object.keys(pool.map));
    var id = request.payload.username || request.headers.username;
    if (pool.map[id]) {
      console.log("pool already exist");
      console.log("print current pool");
      console.log(pool.map[id].obj);
      realFunc(pool.map[id].obj, request, reply);
    } else {
      console.log("initiate new pool");

      if (request.headers.token) {
        console.log("client has token");
        console.log(request.headers.token);
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
                var credential = {
                  user : result.username,
                  host : result.host,
                  port : result.port,
                  tls : result.tls
                }
                console.log("decrypt password");
                credential.password = privateKey.decrypt(result.password);
  
                createPool(request, reply, credential, function(client){
                  console.log("Successfully connect");
                  realFunc(pool.map[id].obj, request, reply);
                });
              }
            })
          }
        })
      } else {
        console.log("client does not have token");
        var credential = {
          user : request.payload.username,
          password : request.payload.password,
          host : request.payload.host,
          port : request.payload.port,
          tls : request.payload.tls
        }
        createPool(request, reply, credential, function(client){
          console.log("Successfully connect");
          // Successfully connected to IMAP server, save the credentials
    
          // create key pair to encrypt password
          console.log("generating key pair");
          var keys = forge.pki.rsa.generateKeyPair({bits:1024});
          var publicKey = keys.publicKey;
    
          // Save key pair to db
          var keyPair = {}
          var publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
          keyPair.publicKey = forge.util.encode64(forge.pem.decode(publicKeyPem)[0].body);
          keyPair.privateKey = forge.pki.privateKeyToPem(keys.privateKey);
          console.log("Save key pair to db");
          keyModel().create(keyPair, function(err, result){
            if (err) {
              console.log("Fails to save key pair to db");
              return reject(err);
            }
            console.log("encrypt password");
            request.payload.password = publicKey.encrypt(request.payload.password);
            console.log("save to payload");
            request.payload.publicKey = keyPair.publicKey;
            console.log("save credential to db");
            model().create(request.payload, function(err, result){
              console.log(err);
              console.log(result);
              if (err) {
                console.log("fail to save credential to db");
                return reject(err);
              }
              pool.map[id].obj.publicKey = keyPair.publicKey;
              realFunc(pool.map[id].obj, request, reply);
            })
          })
        });
      }
    }
  })
}


ImapAPI.prototype.connect = function(request, reply) {
  var realFunc = function(client, request, reply) {
    try {
      client.connect()
    } catch(err) {
      if (err) {
        return reply(err);
      }
    }
    reply(client.publicKey);
  }
  checkPool(request, reply, realFunc)
}

ImapAPI.prototype.listBox = function(request, reply) {
  var realFunc = function(client, request, reply) {
    console.log("list box real function 2");
    console.log(request.payload);
    client.listBox(request.payload.boxName)
      .then(function(result){
        reply(result);
      })
      .catch(function(err){
        reply(err);
      })
  }
  checkPool(request, reply, realFunc);
}

/* ImapAPI.prototype.getSpecialBoxes = function(request, reply) { */

/*   var realFunc = function(client, request, reply) { */
/*     client.getSpecialBoxes() */
/*       .then(function(specials){ */
/*         reply(specials); */
/*       }) */
/*       .catch(function(err){ */
/*         return reply(err); */
/*       }) */
/*   } */

/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       return reply(err); */
/*     }) */
  
/* } */

/* ImapAPI.prototype.getBoxes = function(request, reply) { */
  
/*   var realFunc = function(client, request, reply) { */
/*     client.getBoxes() */
/*       .then(function(boxes){ */
/*         console.log(3); */
/*         console.log(boxes); */
/*         // Circular object, should be simplified */
/*         reply("ok"); */
/*       }) */
/*       .catch(function(err){ */
/*         console.log(4); */
/*         console.log(err); */
/*         reply(err); */
/*       }) */
/*   } */

/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       reply(err); */
/*     }) */
  
/* } */


/* ImapAPI.prototype.addBox = function(request, reply) { */
/*   var realFunc = function(client, request, reply) { */
/*     console.log(request.payload.boxName); */
/*     client.createBox(request.payload.boxName) */
/*       .then(function(){ */
/*         reply("success"); */
/*       }) */
/*       .catch(function(err){ */
/*         reply(err); */
/*       }) */
/*   } */
  
/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       return reply(err); */
/*     }) */
/* } */

/* ImapAPI.prototype.removeBox = function(request, reply) { */
/*   var realFunc = function(client, request, reply) { */
/*     console.log(request.payload.boxName); */
/*     client.removeBox(request.payload.boxName) */
/*       .then(function(){ */
/*         reply("success"); */
/*       }) */
/*       .catch(function(err){ */
/*         reply(err); */
/*       }) */
/*   } */
  
/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       return reply(err); */
/*     }) */
/* } */

/* ImapAPI.prototype.renameBox = function(request, reply) { */
/*   var realFunc = function(client, request, reply) { */
/*     console.log(request.payload.boxName); */
/*     client.renameBox(request.payload.boxName, request.payload.newBoxName) */
/*       .then(function(){ */
/*         reply("success"); */
/*       }) */
/*       .catch(function(err){ */
/*         reply(err); */
/*       }) */
/*   } */
  
/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       return reply(err); */
/*     }) */
/* } */

/* ImapAPI.prototype.retrieveMessage = function(request, reply) { */
/*   var realFunc = function(client, request, reply) { */
/*     client.retrieveMessage(request.payload.messageId, request.payload.boxName) */
/*       .then(function(){ */
/*         reply("success"); */
/*       }) */
/*       .catch(function(err){ */
/*         return reply(err); */
/*       }) */
/*   } */
  
/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       return reply(err); */
/*     }) */
/* } */

/* ImapAPI.prototype.moveMessage = function(request, reply) { */
/*   var realFunc = function(client, request, reply) { */
/*     client.retrieveMessage(request.payload.messageId, request.payload.boxName, request.payload.newBoxName) */
/*       .then(function(){ */
/*         reply("success"); */
/*       }) */
/*       .catch(function(err){ */
/*         return reply(err); */
/*       }) */
/*   } */
  
/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       return reply(err); */
/*     }) */
/* } */

/* ImapAPI.prototype.removeMessage = function(request, reply) { */
/*   var realFunc = function(client, request, reply) { */
/*     client.removeMessage(request.payload.messageId, request.payload.boxName) */
/*       .then(function(){ */
/*         reply("success"); */
/*       }) */
/*       .catch(function(err){ */
/*         return reply(err); */
/*       }) */
/*   } */
  
/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       return reply(err); */
/*     }) */
/* } */

/* ImapAPI.prototype.newMessage = function(request, reply) { */
/*   var realFunc = function(client, request, reply) { */
/*     client.newMessage(request.payload.messageData) */
/*       .then(function(){ */
/*         reply("success"); */
/*       }) */
/*       .catch(function(err){ */
/*         return reply(err); */
/*       }) */
/*   } */
  
/*   checkPool(request, reply) */
/*     .then(function(client){ */
/*       realFunc(client, request, reply); */
/*     }) */
/*     .catch(function(err){ */
/*       return reply(err); */
/*     }) */
/* } */

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
    host : String,
    port : Number,
    username: String,
    password: String,
    tls : Boolean,
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
  Imap : Imap,
  SMTP : SMTP
};
