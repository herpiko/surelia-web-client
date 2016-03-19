'use strict';
var Login = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService, ngProgressFactory, ToastrService, conf, $translate, $http){
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
  this.$http = $http;
  var self = this;
  
  if (self.conf.domainLogoApi && self.conf.defaultDomainLogoPath) {
    self.defaultDomainLogo = self.conf.defaultDomainLogoPath;
    self.currentDomainLogo = self.defaultDomainLogo;
  }
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

Login.prototype.completeUsername = function() {
  var self = this;
  if (!self.$scope.credential || !self.$scope.credential.username) {
    return;
  } 
  if (self.$scope.credential.username.indexOf('@') < 0) {
    self.$scope.credential.username += '@' + self.conf.mainDomain;
  }
  // Fetch domain logo
  if (self.conf.domainLogoApi && self.$scope.credential.username.split('@')[1] != self.conf.mainDomain) {
    self.$http({
      method: "GET",
      url : self.conf.domainLogoApi + self.$scope.credential.username.split('@')[1]
    })
      .then(function(data, status){
        console.log(data);
        if (data && data.data) {
          return self.currentDomainLogo = "data:image/png;base64," + data.data;
        }
        self.currentDomainLogo = self.defaultDomainLogo;
      })
      .catch(function(data, status){
        self.currentDomainLogo = self.defaultDomainLogo;
      })
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
