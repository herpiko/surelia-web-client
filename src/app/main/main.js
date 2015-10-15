'use strict';
var Main = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService){
  this.$scope = $scope;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$window = $window;
  this.localStorageService = localStorageService;
  this.$stateParams = $stateParams;
  this.ImapService = ImapService;
  var self = this;

  // Load basic information
  self.getBoxes();
  self.getSpecialBoxes();
}

Main.prototype.getBoxes = function(){
  var self = this;
  console.log("boxes");
  self.ImapService.getBoxes()
    .success(function(data){
      console.log(data);
      self.$rootScope.boxes = data;
      self.listBox("INBOX");
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}
Main.prototype.getSpecialBoxes = function(){
  var self = this;
  console.log("special boxes");
  self.ImapService.getSpecialBoxes()
    .success(function(data){
      console.log(data);
      self.$rootScope.specialBoxes = Object.keys(data);
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.listBox = function(boxName){
  var self = this;
  console.log("list box content");
  self.ImapService.listBox(boxName)
    .success(function(data){
      console.log(data);
      self.$rootScope.currentList = data;
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.addBox = function(boxName){
  var self = this;
  console.log("add box");
  self.ImapService.addBox(boxName)
    .success(function(data){
      console.log(data);
      alert("Success");
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.renameBox = function(boxName, newBoxName){
  var self = this;
  console.log("rename box");
  self.ImapService.renameBox(boxName, newBoxName)
    .success(function(data){
      console.log(data);
      alert("Success");
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.deleteBox = function(boxName){
  var self = this;
  console.log("delete box");
  self.ImapService.deleteBox(boxName)
    .success(function(data){
      console.log(data);
      alert("Success");
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.retrieveMessage = function(id, boxName){
  var self = this;
  console.log("retrieve message");
  self.ImapService.retrieveMessage(id, boxName)
    .success(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.moveMessage = function(id, boxName, newBoxName){
  var self = this;
  console.log("move message");
  self.ImapService.moveMessage(id, boxName, newBoxName)
    .success(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.deleteMessage = function(id, boxName){
  var self = this;
  console.log("delete message");
  self.ImapService.deleteMessage(id, boxName)
    .success(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}
Main.prototype.newMessage = function(newMessage){
  var self = this;
  console.log("new message");
  // Append random string for testing purpose
  newMessage.subject += " " + Math.random().toString(36).substr(2, 5);
  newMessage.text += " " + Math.random().toString(36).substr(2, 5);
  self.ImapService.newMessage(newMessage)
    .success(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.logout = function(){
  var self = this;
  console.log("logout");
  self.ImapService.logout()
    .success(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.prototype.sendMessage = function(msg){
  var self = this;
  console.log("send message");
  // Append random string for testing purpose
  msg.subject += " " + Math.random().toString(36).substr(2, 5);
  msg.text += " " + Math.random().toString(36).substr(2, 5);
  self.ImapService.sendMessage(msg)
    .success(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .error(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Main.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService"];

module.exports = Main;
