'use strict';
var ErrorHandlerService = function($http, localStorageService, $rootScope, $state, $q) {
  this.$http = $http;
  this.localStorageService = localStorageService;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$q = $q;
}

ErrorHandlerService.prototype.parse = function(data, status) {
  var self = this;
  if (status == 401) {
    self.localStorageService.remove("username"); 
    self.localStorageService.remove("token"); 
    self.isLoggedIn = false;
    self.$state.go("start");
  }
}

ErrorHandlerService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q"];

var module = require("./index");
module.service("ErrorHandlerService", ErrorHandlerService);

