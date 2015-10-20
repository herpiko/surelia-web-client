'use strict';
var lodash = require("lodash");
var mimeTypes = {
  "word" : {
    icon : "file-word-o",
    type : [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.doument",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
      "application/rtf",
    ]
  }, 
  "excel" : {
    icon : "file-excel-o",
    type : [
      "application/vnd.ms-excel",
      "application/vnd.ms-excel.addin.macroEnabled.12",
      "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template"
    ]
  },
  "powerpoint" : {
    icon : "file-powerpoint-o",
    type : [
      "application/vnd.openxmlformats-officedocument.presentationml.slide",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpointtd",
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
      "application/vnd.openxmlformats-officedocument.presentationml.template",
    ]
  },
  "pdf" : {
    icon : "file-pdf-o",
    type : [
      "application/pdf",
      "application/postscript",
    ]
  },
  "image" : {
    icon : "file-image-o",
    type : [
      "image/bmp",
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/tiff"
    ]
  },
  "archive" : {
    icon : "file-archive-o",
    type : [
      "application/x-bzip2",
      "application/x-gzip",
      "application/x-tar",
      "application/zip",
      "application/x-compressed-zip",
    ]
  },
  "code" : {
    icon : "file-code-o",
    type : [
      "application/x-javascript",
      "application/x-perl",
    ]
  },
  "text" : {
    icon : "file-text-o",
    type : [
      "text/plain",
      "text/html",
      "text/css",
      "text/tab-separated-values"
    ]
  },
  "other" : {
    icon : "file-archive-o",
    type : [
      "application/xml",
      "application/octet-stream",
    ]
  }
}
var Message = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService, ErrorHandlerService, ngProgressFactory, $compile, $timeout){
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
  this.$timeout = $timeout;
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
  self.formatBytes = function(bytes) {
      if(bytes < 1024) return bytes + " Bytes";
      else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KB";
      else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MB";
      else return(bytes / 1073741824).toFixed(3) + " GB";
  };
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
      var html = "";
      if (self.currentMessage.parsed.html) {
        console.log("html");
        html = self.currentMessage.parsed.html;
      } else {
        console.log("text");
        html = "<pre>" + self.currentMessage.parsed.text + "</pre>";
      }
      var linkFn = self.$compile(html);
      var content = linkFn(self.$scope);
      e.append(content);
      // Set size and icon
      if (self.currentMessage.parsed.attachments.length > 0) {
        var attachments = self.currentMessage.parsed.attachments;
        for (var i = 0; i < attachments.length;i++) {
          self.currentMessage.parsed.attachments[i].size = self.formatBytes(attachments[i].length);
          lodash.some(mimeTypes, function(mime){
            var matched = lodash.some(mime.type, function(type){
              return type === attachments[i].contentType;
            });
            if (matched) {
              console.log(mime.icon);
              attachments[i].icon = mime.icon;
              return;
            }
          })
        }
      }

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
  var username = self.localStorageService.get("username"); 
  var token = self.localStorageService.get("token"); 
  console.log("logout");
  self.$rootScope.isLoggedIn = false;
  self.localStorageService.remove("username"); 
  self.localStorageService.remove("token"); 
  self.ImapService.logout(username, token)
  self.$timeout(function(){
    self.$state.go("Login");
    self.loading.complete();
  }, 500)
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

Message.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService", "$timeout"];

var module = require("./index");
module.controller("MessageCtrl", Message);
