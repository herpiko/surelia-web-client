var Imap = require("./imap").module;
var SMTP = require("./smtp").module;
console.log(Imap);
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
