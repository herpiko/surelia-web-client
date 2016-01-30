'use strict';
var SettingsService = function($http, localStorageService, $rootScope, $state, $q) {
  this.$http = $http;
  this.localStorageService = localStorageService;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$q = $q;
}

SettingsService.prototype.setPassword = function(username, oldPassword, newPassword) {
  var self = this;
  var promise = self.$q.defer();
  var path = "/api/1.0/settings/set-password";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    headers : {
      token : token,
      username : username
    },
    data : {
      username : username,
      oldPassword : oldPassword,
      newPassword : newPassword
    }
  }
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

SettingsService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q"];

var module = require("./index");
module.service("SettingsService", SettingsService);

