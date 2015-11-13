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

ToastrService.prototype.invalidCredentials = function(){
  var self = this;
  self.toastr.error(self.$filter("translate")("TOASTR_INVALID_CREDENTIALS"));
}

ToastrService.prototype.invalidEmailAddress = function(emailString){
  var self = this;
  if (emailString) {
    self.toastr.error(emailString + self.$filter("translate")("TOASTR_INVALID_EMAIL"));
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

ToastrService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q", "toastr", "$filter"];

var module = require("./index");
module.service("ToastrService", ToastrService);

