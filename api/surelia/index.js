var Imap = require("./imap").module;
var SMTP = require("./smtp").module;
exports.register = function(server, options, next) {
  new Imap(server, options, next);
  next();
};

exports.register.attributes = {
  pkg: require("./package.json")
};

exports.module = {
  Imap : Imap,
  SMTP : SMTP
};
