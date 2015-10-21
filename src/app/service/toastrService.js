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
  if ( data && data.err &&  data.err == "Invalid credentials") {
    self.invalidCredentials();
  }
}

ToastrService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q", "toastr"];

var module = require("./index");
module.service("ToastrService", ToastrService);

