'use strict';
var Message = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService, ErrorHandlerService, ngProgressFactory, $compile){
  this.$scope = $scope;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$window = $window;
  this.localStorageService = localStorageService;
  this.$stateParams = $stateParams;
  this.ImapService = ImapService;
  this.ErrorHandlerService = ErrorHandlerService;
  this.ngProgressFactory = ngProgressFactory;
  this.$compile = $compile;
  var self = this;
  self.loading = self.ngProgressFactory.createInstance();
  
  if (self.localStorageService.get("username")) {
    self.$rootScope.currentUsername = self.localStorageService.get("username");
  }

  // Load basic information
  self.loading.set(20);
  self.ImapService.getBoxes()
    .success(function(data, status){
  self.loading.set(30);
      self.listBox("INBOX");
      self.getSpecialBoxes();
      self.ErrorHandlerService.parse(data, status);
      self.boxes = data;
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
      self.ErrorHandlerService.parse(data, status);
    })
}

Message.prototype.getBoxes = function(){
  var self = this;
  self.loading.start();
  console.log("boxes");
  self.ImapService.getBoxes()
    .success(function(data, status){
      self.loading.complete();
      console.log(data);
      self.ErrorHandlerService.parse(data, status);
      self.boxes = data;
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
      self.ErrorHandlerService.parse(data, status);
    })
}
Message.prototype.getSpecialBoxes = function(){
  var self = this;
  console.log("special boxes");
  self.ImapService.getSpecialBoxes()
    .success(function(data){
      console.log(data);
      self.specialBoxes = data;
    })
    .error(function(data, status){
      console.log(data, status);
    })
}

Message.prototype.listBox = function(boxName){
  var self = this;
  self.loading.start();
  self.view = "list";
  console.log("list box content");
  self.ImapService.listBox(boxName, true)
    .then(function(data){
      self.loading.complete();
      console.log(data);
      self.currentList = data;
    })
    .catch(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.addBox = function(boxName){
  var self = this;
  self.loading.start();
  console.log("add box");
  self.ImapService.addBox(boxName)
    .success(function(data){
      self.loading.complete();
      console.log(data);
      alert("Success");
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.renameBox = function(boxName, newBoxName){
  var self = this;
  self.loading.start();
  console.log("rename box");
  self.ImapService.renameBox(boxName, newBoxName)
    .success(function(data){
      self.loading.complete();
      console.log(data);
      alert("Success");
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.deleteBox = function(boxName){
  var self = this;
  self.loading.start();
  console.log("delete box");
  self.ImapService.deleteBox(boxName)
    .success(function(data){
      self.loading.complete();
      console.log(data);
      alert("Success");
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.retrieveMessage = function(id, boxName){
  var self = this;
  self.loading.start();
  console.log("retrieve message");
  self.ImapService.retrieveMessage(id, boxName, true)
    .then(function(data){
      self.loading.complete();
      console.log(data);
      self.view = "message";
      self.currentMessage = data;
      var e = angular.element(document.querySelector("#messageContent"));
      e.empty();
      var html = self.currentMessage.parsed.html;
      var linkFn = self.$compile(html);
      var content = linkFn(self.$scope);
      e.append(content);
    })
    .catch(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.moveMessage = function(id, boxName, newBoxName){
  var self = this;
  self.loading.start();
  console.log("move message");
  self.ImapService.moveMessage(id, boxName, newBoxName)
    .success(function(data){
      self.loading.complete();
      console.log(data);
      alert(JSON.stringify(data));
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.deleteMessage = function(id, boxName){
  var self = this;
  self.loading.start();
  console.log("delete message");
  self.ImapService.deleteMessage(id, boxName)
    .success(function(data){
      self.loading.complete();
      console.log(data);
      alert(JSON.stringify(data));
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}
Message.prototype.newMessage = function(newMessage){
  var self = this;
  self.loading.start();
  console.log("new message");
  self.ImapService.newMessage(newMessage)
    .success(function(data){
      self.loading.complete();
      console.log(data);
      alert("Saved as draft.\n" + JSON.stringify(data));
      self.view = "list";
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.logout = function(){
  var self = this;
  self.loading.start();
  console.log("logout");
  self.ImapService.logout()
    .success(function(data){
      self.loading.complete();
      console.log(data);
      self.localStorageService.remove("username"); 
      self.localStorageService.remove("token"); 
      self.isLoggedIn = false;
      self.$state.go("Login");
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.sendMessage = function(msg){
  var self = this;
  self.loading.start();
  console.log("send message");
  self.ImapService.sendMessage(msg)
    .success(function(data){
      self.loading.complete();
      console.log(data);
      alert("Message was sent successfully.\n" + JSON.stringify(data));
      self.view = "list";
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.compose = function(){
  var self = this;
  self.view = "compose";
  self.newMessage = {
    from : self.localStorageService.get("username"),
    sender : self.localStorageService.get("username"),
  };
  console.log("compose message");
}

Message.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService"];

var module = require("./index");
module.controller("MessageCtrl", Message);
