'use strict';
var AddressBookService = function($http, localStorageService, $rootScope, $state, $q) {
  this.$http = $http;
  this.localStorageService = localStorageService;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$q = $q;
}

AddressBookService.prototype.get = function(credential, canceler) {
  var self = this;
  if (self.$rootScope.authCanceler) {
    self.$rootScope.authCanceler.resolve();
  }
  self.$rootScope.authCanceler = self.$q.defer();
  var promise = self.$q.defer();
  var path = "/api/1.0/address-book";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "GET",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  if (canceler) {
    req.timeout = self.$rootScope.authCanceler.promise;
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

AddressBookService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q"];

var module = require("./index");
module.service("AddressBookService", AddressBookService);

