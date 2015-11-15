'use strict';
var FirstLetterCapitalize = function() {
  return function(string) {
    return string[0].toUpperCase() + string.slice(1).toLowerCase();
  }
}

var module = require("./index");
module.filter("FirstLetterCapitalize", FirstLetterCapitalize);

