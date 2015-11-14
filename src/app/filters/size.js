'use strict';
var SizeFilter = function() {
  return function(bytes) {
    if(bytes < 1024) return parseInt(bytes).toLocaleString("id") + " Bytes";
    else if(bytes < 1048576) return parseInt((bytes / 1024).toFixed(0)).toLocaleString("id") + " KB";
    else if(bytes < 1073741824) return parseInt((bytes / 1048576).toFixed(0)).toLocaleString("id") + " MB";
    else return parseInt((bytes / 1073741824).toFixed(0)).toLocaleString("id") + " GB";
  }
}

var module = require("./index");
module.filter("SizeFilter", SizeFilter);

