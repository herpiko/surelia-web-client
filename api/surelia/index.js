var Imap = require("./imap").module;
var SMTP = require("./smtp").module;
var Pool = require("./pool").module;
var composer = require("mailcomposer");

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
    method : "GET",
    path : "/api/1.0/special-boxes",
    handler : function(request, reply){
      self.specialBoxes(request, reply);
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
    method : "DELETE",
    path : "/api/1.0/delete-box",
    handler : function(request, reply){
      self.renameBox(request, reply);
    }
  })
  self.server.route({
    method : "GET",
    path : "/api/1.0/retrieve",
    handler : function(request, reply){
      self.renameBox(request, reply);
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

ImapAPI.prototype.connect = function(request, reply) {
  var credentials = {
    user : request.payload.user,
    password : request.payload.password,
    host : request.payload.host,
    port : request.payload.port,
    tls : request.payload.tls
  }
  var imap = new Imap(credentials);
}

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
