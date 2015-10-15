'use strict';
var Start = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService){
  this.$scope = $scope;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$window = $window;
  this.localStorageService = localStorageService;
  this.$stateParams = $stateParams;
  this.ImapService = ImapService;
  var self = this;

  if (self.$rootScope.isLoggedIn || self.localStorageService.get("token")) {
    self.$state.go("main");
  }
  self.$scope.credential = {
    username : "surelia.web.client@gmail.com",
    password : "katasandisurelia",
    imapHost : "imap.gmail.com",
    imapPort : "993",
    imapTLS : true,
    smtpHost : "smtp.gmail.com",
    smtpPort : "465",
    smtpTLS : true,
    smtpSecure : true
  }
}

Start.prototype.auth = function(credential){
  var self = this;
  console.log("auth");
  self.ImapService.auth(credential)
    .then(function(data){
      console.log(data);
      alert("Token : " + data);
      self.$state.go("main");
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}


Start.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService"];

module.exports = Start;
