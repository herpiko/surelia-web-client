'use strict';
var ForgetPasswordService = function($http) {
  this.$http = $http;
}

ForgetPasswordService.prototype.resetPassword = function(username) {
  var self = this;
  var path = "/api/1.0/settings/reset-password";
  var req = {
    method: "POST",
    url : path,
    data: {
      username: username
    }
  }
  return self.$http(req);
}

ForgetPasswordService.inject = ["$http"];

var module = require("./index");
module.service("ForgetPasswordService", ForgetPasswordService);

