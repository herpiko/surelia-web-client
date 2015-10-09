var SMTPConnection = require("smtp-connection");

/**
 * Class to handle SMTP connection
 *
 * @param {Object} options - Options that contains host, port, and other SMTP configuration
 */
var SMTP = function(options) {
  this.connection = new SMTPConnection(options);
  this.connected = false;
  this.connection.on("error", function(err){
    this.connected = false;
    console.log(err);
  })
}

/**
 * Get information whether the SMTP client is connected or not
 *
 * @returns {Boolean} - Boolean value that represents whether the SMTP client is connected or not
 */

SMTP.prototype.isConnected = function() {
  var self = this;
  return self.connected
}

/**
 * Connect to the SMTP server
 *
 * @returns {Promise}
 */
SMTP.prototype.connect = function() {
  var self = this;
  return new Promise(function(resolve, reject){
    self.connection.connect(function(){
    self.connected = true;
      resolve();
    })
  })
}

/**
 * Authenticates to the SMTP server
 * @param {String} username - Username
 * @param {String} password - Password
 * @returns {Promise}
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
 * Send message to the server. This function returns information about whether the mesasge is accepted or not.
 * @param {String[]} sender - The recipients of the email
 * @param {String[]} recipients - The recipients of the email
 * @param {String} data - The email message
 * @returns {Promise}
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

module.exports = SMTP;
