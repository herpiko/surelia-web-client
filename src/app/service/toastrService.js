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

ToastrService.prototype.invalidEmailAddress = function(emailString){
  var self = this;
  if (emailString) {
    self.toastr.error(emailString + " is not a valid email address");
  } else {
    self.toastr.error("Invalid email address");
  }
}

ToastrService.prototype.emptyRecipients = function(){
  var self = this;
  self.toastr.error("Recipients should not be empty");
}

ToastrService.prototype.sent = function() {
  var self = this;
  self.toastr.success("Your message was sent successfully");
}

ToastrService.prototype.savedAsDraft = function() {
  var self = this;
  self.toastr.success("Your message draft was saved");
}

ToastrService.prototype.deleted = function() {
  var self = this;
  self.toastr.success("Your message was deleted");
}

ToastrService.prototype.parse = function(data, status) {
  var self = this;
  if ( data && data.err &&  data.err == "Invalid credentials") {
    self.invalidCredentials();
  }
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

