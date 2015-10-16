'use strict';
var Login = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService, ngProgressFactory){
  this.$scope = $scope;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$window = $window;
  this.localStorageService = localStorageService;
  this.$stateParams = $stateParams;
  this.ImapService = ImapService;
  this.ngProgressFactory = ngProgressFactory;
  var self = this;
  self.loading = self.ngProgressFactory.createInstance();

  if (self.$rootScope.isLoggedIn || self.localStorageService.get("token")) {
    self.$state.go("Message");
  }
  self.$scope.credential = {
    imapHost : "imap.gmail.com",
    imapPort : "993",
    imapTLS : true,
    smtpHost : "smtp.gmail.com",
    smtpPort : "465",
    smtpTLS : true,
    smtpSecure : true
  }
}

Login.prototype.auth = function(credential){
  var self = this;
  self.loading.start();
  console.log("auth");
  self.ImapService.auth(credential)
    .then(function(data){
      self.loading.complete();
      console.log(data);
      self.$state.go("Message");
    })
    .catch(function(data, status){
      self.loading.complete();
      console.log(data, status);
      alert(data);
    })
}


Login.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService"];

var module = require("./index");
module.controller("LoginCtrl", Login);
