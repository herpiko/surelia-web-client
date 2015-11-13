'use strict';
var SizeFilter = function() {
  return function(bytes) {
    if(bytes < 1024) return bytes + " Bytes";
    else if(bytes < 1048576) return parseFloat((bytes / 1024).toFixed(3)).toLocaleString() + " KB";
    else if(bytes < 1073741824) return parseFloat((bytes / 1048576).toFixed(3)).toLocaleString() + " MB";
    else return parseFloat((bytes / 1073741824).toFixed(3)).toLocaleString() + " GB";
  }
}

var module = require("./index");
module.filter("SizeFilter", SizeFilter);

