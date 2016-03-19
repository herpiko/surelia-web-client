'use strict';
var Login = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService, ngProgressFactory, ToastrService, conf, $translate){
  this.$scope = $scope;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$window = $window;
  this.localStorageService = localStorageService;
  this.$stateParams = $stateParams;
  this.ImapService = ImapService;
  this.ngProgressFactory = ngProgressFactory;
  this.ToastrService = ToastrService;
  this.conf = conf;
  this.$translate = $translate;
  var self = this;

  self.$rootScope.pageTitle = 'Login - ' + self.conf.appName;
  self.loading = self.ngProgressFactory.createInstance();

  if (self.$rootScope.isLoggedIn || self.localStorageService.get("token")) {
    self.$state.go("Surelia");
  }
  self.$scope.credential = {
    imapHost : self.conf.imap.host,
    imapPort : self.conf.imap.port.toString(),
    imapTLS : true,
    smtpHost : self.conf.smtp.host,
    smtpPort : self.conf.smtp.port.toString(),
    smtpTLS : true,
    smtpSecure : true,
    rememberMe : false
  }
}

Login.prototype.switchLang = function(lang) {
  var self = this;
  self.$translate.use(lang);
}

Login.prototype.completeUsername = function(credential) {
  var self = this;
  console.log(1);
  if (self.$scope.credential && self.$scope.credential.username && self.$scope.credential.username.indexOf('@') < 0) {
    console.log(2);
    self.$scope.credential.username += '@' + self.conf.mainDomain;
  } else {
    console.log(3);
  }
}

Login.prototype.auth = function(credential){
  var self = this;
  self.loading.start();
  console.log("auth");
  self.ImapService.auth(credential, true)
    .then(function(data){
      self.loading.complete();
      console.log(data);
      self.$state.go("Surelia");
    })
    .catch(function(data, status){
      self.loading.complete();
      console.log(data, status);
      self.ToastrService.parse(data);
    })
}


Login.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService", "conf", "$translate"];

var module = require("./index");
module.controller("LoginCtrl", Login);
