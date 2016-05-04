'use strict';
var ForgetPassword = function ($scope, $rootScope, $state, $window, $stateParams, ForgetPasswordService){
  this.$scope = $scope;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$window = $window;
  this.$stateParams = $stateParams;
  this.ForgetPasswordService = ForgetPasswordService;
  var self = this;

  self.account = '';
  self.stage = 0;
}

ForgetPassword.prototype.resetPassword = function() {
  var self = this;

  if (self.isFormValid()) {
    self.stage = 1;
    self.ForgetPasswordService.resetPassword(self.account).then(function() {
      self.stage = 2;
      self.account = '';

    }).catch(function() {
      self.stage = 2;
      self.account = '';
    });
  }
}


ForgetPassword.prototype.isFormValid = function() {
  var self = this;
  var length = self.account.length;
  var atFound = self.account.indexOf('@');

  var valid = (length > 0 && atFound > 0 && ((atFound + 1) < length));
  return valid;
}

ForgetPassword.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "ForgetPasswordService"];

var module = require("./index");
module.controller("ForgetPasswordCtrl", ForgetPassword);
