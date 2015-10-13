var Start = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService){
  this.$scope = $scope;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$window = $window;
  this.localStorageService = localStorageService;
  this.$stateParams = $stateParams;
  this.ImapService = ImapService;
  var self = this;
  this.$scope.credential = {
    username : "surelia.web.client@gmail.com",
    password : "katasandisurelia",
    host : "imap.gmail.com",
    port : 993,
    tls : true,
  }
  this.$scope.newMessage = {
    from : "surelia.web.client@gmail.com",
    recipients : "surelia.web.client@gmail.com",
    sender : "Surelia",
    subject : "Subjek",
    text : "Isi surel"
  }
  this.$scope.messageToSend = {
    username : "surelia.web.client@gmail.com",
    password : "katasandisurelia",
    host : "smtp.gmail.com",
    port : 465,
    tls : true,
    secure :true,
    from : "surelia.web.client@gmail.com",
    recipients : "surelia.web.client@gmail.com",
    sender : "Surelia",
    subject : "Subjek",
    text : "Isi surel"
  }
}

Start.prototype.auth = function(credential){
  var self = this;
  console.log("auth");
  self.ImapService.auth(credential)
    .then(function(data){
      console.log(data);
      alert("Token : " + data);
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.getBoxes = function(){
  var self = this;
  console.log("boxes");
  self.ImapService.getBoxes()
    .then(function(data){
      console.log(data);
      alert("Boxes : \n" + JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}
Start.prototype.getSpecialBoxes = function(){
  var self = this;
  console.log("special boxes");
  self.ImapService.getSpecialBoxes()
    .then(function(data){
      console.log(data);
      alert("Special Boxes : \n" + JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.listBox = function(boxName){
  var self = this;
  console.log("list box content");
  self.ImapService.listBox(boxName)
    .then(function(data){
      console.log(data);
      alert("List of box boxName : \n" + JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.addBox = function(boxName){
  var self = this;
  console.log("add box");
  self.ImapService.addBox(boxName)
    .then(function(data){
      console.log(data);
      alert("Success");
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.renameBox = function(boxName, newBoxName){
  var self = this;
  console.log("rename box");
  self.ImapService.renameBox(boxName, newBoxName)
    .then(function(data){
      console.log(data);
      alert("Success");
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.deleteBox = function(boxName){
  var self = this;
  console.log("delete box");
  self.ImapService.deleteBox(boxName)
    .then(function(data){
      console.log(data);
      alert("Success");
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.retrieveMessage = function(id, boxName){
  var self = this;
  console.log("retrieve message");
  self.ImapService.retrieveMessage(id, boxName)
    .then(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.moveMessage = function(id, boxName, newBoxName){
  var self = this;
  console.log("move message");
  self.ImapService.moveMessage(id, boxName, newBoxName)
    .then(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.deleteMessage = function(id, boxName){
  var self = this;
  console.log("delete message");
  self.ImapService.deleteMessage(id, boxName)
    .then(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}
Start.prototype.newMessage = function(newMessage){
  var self = this;
  console.log("new message");
  // Append random string for testing purpose
  newMessage.subject += " " + Math.random().toString(36).substr(2, 5);
  newMessage.text += " " + Math.random().toString(36).substr(2, 5);
  self.ImapService.newMessage(newMessage)
    .then(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.logout = function(){
  var self = this;
  console.log("logout");
  self.ImapService.logout()
    .then(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.prototype.sendMessage = function(msg){
  var self = this;
  console.log("send message");
  // Append random string for testing purpose
  msg.subject += " " + Math.random().toString(36).substr(2, 5);
  msg.text += " " + Math.random().toString(36).substr(2, 5);
  self.ImapService.sendMessage(msg)
    .then(function(data){
      console.log(data);
      alert(JSON.stringify(data));
    })
    .catch(function(data, status){
      console.log(data, status);
      alert(data);
    })
}

Start.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService"];

angular.module("start",[])
.controller("StartCtrl", Start);

