var SMTPConnection = require("smtp-connection");

/**
 * Class to handle SMTP connection
 * @param {String} host - The host of the server
 */
var SMTP = function(options) {
  this.connection = new SMTPConnection(options);
  this.connection.on("error", function(err){
    console.log(err);
  })
}

/**
 * Connect to the SMTP server
 *
 */
SMTP.prototype.connect = function() {
  var self = this;
  return new Promise(function(resolve, reject){
    self.connection.connect(function(){
      resolve();
    })
  })
}

/**
 * Authenticates to the SMTP server
 * @param {String} username - Username
 * @param {String} password - Password
 */
SMTP.prototype.auth = function(username, password) {
  var self = this;
  var auth = {
    user : username,
    pass : password
  }
  return new Promise(function(resolve, reject){
    self.connection.login(auth, function(err){
      if (err) {
        return reject(err);
      }
      resolve();
    })
  })
}

/**
 * Send message to the server
 * @param {String[]} recipients - The recipients of the email
 * @param {String} data - The email message
 */
SMTP.prototype.send = function(sender, recipients, data) {
  var self = this;
  return new Promise(function(resolve, reject){
    var envelope = {
      from : sender,
      to : recipients,
    }
    self.connection.send(envelope, data, function(err, info){
      if (err) {
        return reject(err)
      }
      resolve(info);
    })
  })
}

exports.module = SMTP;
