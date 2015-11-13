'use strict';
var ToastrService = function($http, localStorageService, $rootScope, $state, $q, toastr, $filter) {
  this.$http = $http;
  this.localStorageService = localStorageService;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$q = $q;
  this.toastr = toastr;
  this.$filter = $filter;
}

ToastrService.prototype.error500 = function(){
  var self = this;
  self.toastr.error(self.$filter("translate")("TOASTR_ERROR_500"));
}

ToastrService.prototype.connectionError = function(){
  var self = this;
  self.toastr.error(self.$filter("translate")("TOASTR_CONNECTION_ERROR"));
}

ToastrService.prototype.invalidCredentials = function(){
  var self = this;
  self.toastr.error(self.$filter("translate")("TOASTR_INVALID_CREDENTIALS"));
}

ToastrService.prototype.invalidEmailAddress = function(emailString){
  var self = this;
  if (emailString) {
    self.toastr.error(emailString + self.$filter("translate")("TOASTR__INVALID_EMAIL"));
  } else {
    self.toastr.error(self.$filter("translate")("TOASTR_INVALID_EMAIL"));
  }
}

ToastrService.prototype.emptyRecipients = function(){
  var self = this;
  self.toastr.error(self.$filter("translate")("TOASTR_RECIPIENTS_SHOULDNT_EMPTY"));
}

ToastrService.prototype.sent = function() {
  var self = this;
  self.toastr.success(self.$filter("translate")("TOASTR_SENT_SUCCESSFULLY"));
}

ToastrService.prototype.savedAsDraft = function() {
  var self = this;
  self.toastr.success(self.$filter("translate")("TOASTR_DRAFT_SAVED"));
}

ToastrService.prototype.deleted = function() {
  var self = this;
  self.toastr.success(self.$filter("translate")("TOASTR_MESSAGE_DELETED"));
}

ToastrService.prototype.permanentlyDeleted = function() {
  var self = this;
  self.toastr.success(self.$filter("translate")("TOASTR_MESSAGE_PERMANENTLY_DELETED"));
}

// This function intended to parse a request error
// so we could just simply put it in each .catch() / .error() scope
// instead of writing a bunch of toastr functions.
ToastrService.prototype.parse = function(data, status) {
  var self = this;
  if ( data && data.err &&  data.err == "Invalid credentials") {
    self.invalidCredentials();
  } else if (status == 500) {
    self.error500();
  } else if (data == null && status == undefined) {
    // If this point reached, it must be a connection error / timeout / no response
    self.connectionError();
  }
}

ToastrService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q", "toastr", "$filter"];

var module = require("./index");
module.service("ToastrService", ToastrService);

