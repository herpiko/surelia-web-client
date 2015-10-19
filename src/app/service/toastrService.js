'use strict';
var ToastrService = function($http, localStorageService, $rootScope, $state, $q, toastr) {
  this.$http = $http;
  this.localStorageService = localStorageService;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$q = $q;
  this.toastr = toastr;
}

ToastrService.prototype.invalidCredentials = function(){
  var self = this;
  self.toastr.error("Invalid credentials");
}

ToastrService.prototype.parse = function(data, status) {
  var self = this;
  if (data.err
  &&( data.err == "Invalid credentials (Failure)"
  || data.err.substr(0, 13) == "Lookup failed" )) {
    self.invalidCredentials();
  }
}

ToastrService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q", "toastr"];

var module = require("./index");
module.service("ToastrService", ToastrService);

