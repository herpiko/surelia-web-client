'use strict';
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
var Message = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService, ErrorHandlerService, ngProgressFactory, $compile, $timeout, Upload, ToastrService){
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
  this.Upload = Upload;
  this.ToastrService = ToastrService;
  var self = this;
  self.compose = false;
  self.composeMode = "corner";
  self.cc = false;;
  self.bcc = false;
  self.newMessage = {};
  self.isAlpha = function(str) {
    return /^[a-zA-Z()]+$/.test(str);
  }
  self.loading = self.ngProgressFactory.createInstance();
  
  if (self.localStorageService.get("username")) {
    self.$rootScope.currentUsername = self.localStorageService.get("username");
  }

  // Load basic information
  self.loading.set(20);
  self.ImapService.getBoxes()
    .success(function(data, status){
      console.log(data);
      self.loading.set(30);
      var opts = {
        limit : 10,
        page : 1,
      }
      self.listBox("INBOX", opts);
      self.currentBoxName = "INBOX";
      self.currentBoxPath = "INBOX";
      self.getSpecialBoxes();
      self.ErrorHandlerService.parse(data, status);
      self.boxes = data;
      /*
      Trash and Drafts has different count definition.
       - Show no count in Trash box
       - Show total messages in Drafts
      */
      lodash.some(self.specialBoxes, function(box){
        if (box && box.specialName && box.specialName.indexOf("Trash") > -1) {
          box.meta.count = 0;
        } 
        if (box && box.specialName && box.specialName.indexOf("Drafts") > -1) {
          box.meta.count = box.meta.total;
        } 
      });
      lodash.some(self.boxes, function(box){
        if (box && box.boxName && box.boxName.indexOf("Trash") > -1) {
          box.meta.count = 0;
        } 
        if (box && box.boxName && box.boxName.indexOf("Drafts") > -1) {
          console.log(box);
          box.meta.count = box.meta.total;
        } 
      });
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

Message.prototype.listBoxOlder = function(){
  var self = this;
  if (self.currentListMeta.older) {
    var opts = {
      limit : self.currentListMeta.limit,
      page : self.currentListMeta.page + 1,
    }
    var boxName = self.searchString ? "search" : self.currentBoxPath;
    opts.search = self.searchString ? self.searchString : null;
    self.listBox(boxName, opts, true)
  }
}

Message.prototype.listBoxNewer = function(){
  var self = this;
  if (self.currentListMeta.newer) {
    var opts = {
      limit : self.currentListMeta.limit,
      page : self.currentListMeta.page - 1,
    }
    var boxName = self.searchString ? "search" : self.currentBoxPath;
    opts.search = self.searchString ? self.searchString : null;
    self.listBox(boxName, opts, true)
  }
}
Message.prototype.listBox = function(boxName, opts, canceler){
  opts = opts || {};
  var self = this;
  self.loading.start();
  self.view = "list";
  console.log("list box content");
  if (boxName.indexOf("Drafts") > -1) {
    self.isDraft = true;
  } else {
    self.isDraft = false;
  }
  // Set current box property
  var special = lodash.some(self.specialBoxes, function(box){
    if (box.path == boxName) {
      self.currentBoxName = box.specialName;
      self.currentBoxPath = box.path;
      return;
    } 
  });
  var box = lodash.some(self.boxes, function(box){
    if (box.boxName == boxName) {
      self.currentBoxName = box.boxName;
      self.currentBoxPath = box.boxName;
      return;
    } 
  });
  if (boxName == "search") {
    opts.search = opts.search || self.searchString;
  } else {
    opts.search = undefined;
    delete(self.searchString);
  }
  self.ImapService.listBox(boxName, opts, canceler)
    .then(function(data){
      self.loading.complete();
      console.log(data);
      self.currentList = data.data;
      self.currentListMeta = data.meta;
      // Assign message count
      lodash.some(self.specialBoxes, function(box){
        if (box.specialName == boxName) {
          box.meta.count = data.meta.count;
          return;
        } 
      });
      lodash.some(self.boxes, function(box){
        if (box.boxName == boxName) {
          box.meta.count = data.meta.count;
          return;
        } 
      });

      // generate avatar, unread status
      opts.limit = opts.limit || 10;
      var colors = window.randomcolor({count:opts.limit, luminosity : "dark"});
      var assignedColor = [];
      for (var i in self.currentList) {
        var hash = window.objectHash(self.currentList[i].header.from[0]);
        var index = self.isAlpha(self.currentList[i].header.from[0]) ? 0 : 1;
        self.currentList[i].avatar = self.currentList[i].header.from[index].toUpperCase();
        if (assignedColor.indexOf(hash) < 0) {
          assignedColor.push(hash);
          self.currentList[i].color = colors[assignedColor.indexOf(hash)];
        } else {
          self.currentList[i].color = colors[assignedColor.indexOf(hash)];
        }
        self.currentList[i].unread = false;
        console.log(self.currentList[i].attributes.flags.indexOf("\\Seen"));
        if (self.currentList[i].attributes.flags.indexOf("\\Seen") < 0) {
          self.currentList[i].unread = true;
        }
      }
      // calculate pagination nav
      var meta = self.currentListMeta;
      if ((meta.page - 1) > 0) {
        self.currentListMeta.newer = true;
      } else {
        self.currentListMeta.newer = false;
      }
      if (meta.limit * (meta.page +1) - meta.total < opts.limit) {
        self.currentListMeta.older = true;
      } else {
        self.currentListMeta.older = false;
      }
      self.currentListMeta.listStart = (meta.page * meta.limit) - (meta.limit - 1);
      if (self.currentListMeta.listStart + meta.limit > meta.total) {
        self.currentListMeta.listEnd = meta.total;
      } else {
        self.currentListMeta.listEnd = self.currentListMeta.listStart + meta.limit - 1;
      }
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

Message.prototype.retrieveMessage = function(id, boxName, isUnread){
  var self = this;
  self.loading.start();
  console.log("retrieve message");
  self.ImapService.retrieveMessage(id, boxName, true)
    .then(function(data){
      self.loading.complete();
      // If it is an unread message, decrease unread count in current box
      if (isUnread) {
        lodash.some(self.specialBoxes, function(box){
          if (box && box.specialName && box.specialName.indexOf(boxName) > -1) {
            box.meta.count--;
          } 
        });
        lodash.some(self.boxes, function(box){
          if (box && box.boxName && box.boxName.indexOf(boxName) > -1) {
            box.meta.count--;
          } 
        });
        lodash.some(self.currentList, function(message){
          if (message.seq == id) {
            message.unread = false;
          } 
        });
      }
      console.log(data);
      if (boxName.indexOf("Drafts") > -1) {
        console.log("This is a draft");
        data.seq = id;
        self.composeMessage(data);
      } else {
        self.view = "message";
        self.currentMessage = data;
        self.currentMessage.seq = id;
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
        if (self.currentMessage.parsed.attachments && self.currentMessage.parsed.attachments.length > 0) {
          var attachments = self.currentMessage.parsed.attachments;
          for (var i = 0; i < attachments.length;i++) {
            self.currentMessage.parsed.attachments[i].index = i;
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
      }

    })
    .catch(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.getAttachment = function(messageId, index) {
  var self = this;
  self.ImapService.getAttachment(messageId, index)
    .then(function(data){
      self.loading.complete();

      var binary_string = window.atob(data.content);
      var len = binary_string.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++ ) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      var blob = new Blob([bytes.buffer], { type: data.contentType });
      if (typeof window.navigator.msSaveBlob !== 'undefined') {
        window.navigator.msSaveBlob(blob, data.fileName);
      } else {
        var URL = window.URL || window.webkitURL;
        var downloadUrl = URL.createObjectURL(blob);
        var a = document.createElement("a");
        if (typeof a.download === 'undefined') {
          window.location = downloadUrl;
        } else {
          a.href = downloadUrl;
          a.download = data.fileName;
          document.body.appendChild(a);
          a.click();
        }
        setTimeout(function () { URL.revokeObjectURL(downloadUrl); }, 100);
      }
    })
    .catch(function(data, status){
      self.loading.complete();
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
  self.compose = false;
  self.loading.start();
  console.log("send message");
  self.ImapService.sendMessage(msg)
    .success(function(data){
      console.log(data);
      self.view = "list";
      if (msg.seq && msg.messageId) {
        var draftPath;
        if (self.specialBoxes.Drafts && self.specialBoxes.Drafts.path) {
          draftPath = self.specialBoxes.Drafts.path;
        } else {
          draftPath = "Drafts";
        }
        self.ImapService.removeMessage(msg.seq, msg.messageId, draftPath)
          .success(function(data, status, header){
            self.listBox(draftPath);
            self.loading.complete();
            self.ToastrService.sent();
          })
          .error(function(data, status, header){
            self.loading.complete();
          })
      } else {
        self.loading.complete();
      }
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.removeMessage = function(seq, messageId, boxName, toastr){
  var self = this;
  self.loading.start();
  console.log("remove message");
  self.ImapService.removeMessage(seq, messageId, boxName)
    .success(function(data){
      self.loading.complete();
      console.log(data);
      console.log("Message was removed successfully.");
      for (var i = 0;i < self.currentList.length;i++) {
        if (self.currentList[i].seq == seq) {
          self.currentList.splice(i, 1); 
        }
      }
      if (toastr) {
        self.ToastrService.deleted();
      }
      self.view = "list";
      self.listBox("INBOX");
    })
    .error(function(data, status){
      self.loading.complete();
      console.log(data, status);
    })
}

Message.prototype.composeMessage = function(msg){
  var self = this;
  self.compose = true;
  self.cc = false;
  self.bcc = false;
  self.composeMode = "corner";
  self.newMessage = {
    from : self.localStorageService.get("username"),
    sender : self.localStorageService.get("username"),
    recipients : "",
    cc : "",
    bcc : "",
    html : "",
    attachments : []
  };
  // If there is a parameter, then it is an existing draft
  if (msg) {
    console.log(msg);
    self.newMessage.isDraft = true;
    self.newMessage.seq = msg.seq;
    self.newMessage.messageId = msg.parsed.messageId;
    if (msg.parsed.subject) {
      self.newMessage.subject = msg.parsed.subject;
    }
    if (msg.parsed.html) {
      self.newMessage.html = msg.parsed.html;
    }
    if (msg.parsed.attachments && msg.parsed.attachments.length > 0) {
      for(var i in msg.parsed.attachments) {
        var a = {
          filename : msg.parsed.attachments[i].fileName,
          contentType : msg.parsed.attachments[i].contentType,
          encoding : "base64",
          progress : "uploaded",
          attachmentId : msg.parsed.attachments[i].attachmentId
        }
        self.newMessage.attachments.push(a);
      }
    }
    if (msg.parsed.to && msg.parsed.to.length > 0) {
      for(var i in msg.parsed.to) {
        if (self.newMessage.recipients.length > 0) {
          self.newMessage.recipients += ";";
        }
        self.newMessage.recipients += msg.parsed.to[i].address; 
      }
    }
    if (msg.parsed.cc && msg.parsed.cc.length > 0) {
      self.cc = true;
      for(var i in msg.parsed.cc) {
        if (self.newMessage.cc.length > 0) {
          self.newMessage.cc += ";";
        }
        self.newMessage.cc += msg.parsed.cc[i].address; 
      }
    }
    if (msg.parsed.bcc && msg.parsed.bcc.length > 0) {
      self.bcc = true;
      for(var i in msg.parsed.bcc) {
        if (self.newMessage.bcc.length > 0) {
          self.newMessage.bcc += ";";
        }
        self.newMessage.bcc += msg.parsed.bcc[i].address; 
      }
    }
  }
  // Get the hash. It needed for comparing the draft later
  self.currentMessageHash = window.objectHash(self.newMessage);
  console.log(self.currentMessageHash);
}

Message.prototype.saveDraft = function(){
  var self = this;
  self.compose = false;
  var msg = self.newMessage;
  // Save as draft if it has modified
  console.log(window.objectHash(self.newMessage));
  var newHash = window.objectHash(self.newMessage);
  if (newHash !== self.currentMessageHash) {
    self.loading.start();
    console.log("save draft");
    var draftPath;
    if (self.specialBoxes.Drafts && self.specialBoxes.Drafts.path) {
      draftPath = self.specialBoxes.Drafts.path;
    } else {
      draftPath = "Drafts";
    }
    self.ImapService.saveDraft(msg, draftPath)
      .success(function(data, status, header){
        self.ToastrService.savedAsDraft();
        // If it's an existing draft, remove the old one
        if (msg.seq && msg.messageId) {
          self.ImapService.removeMessage(msg.seq, msg.messageId, draftPath)
            .success(function(data, status, header){
              self.listBox(draftPath);
              self.loading.complete();
            })
            .error(function(data, status, header){
              self.loading.complete();
            })
        } else {
          self.loading.complete();
        }
      })
      .error(function(data, status, header){
        self.loading.complete();
      })
  }
}
Message.prototype.discardDraft = function(id){
  var self = this;
  self.compose = false;
  // Remove temporary attachments in surelia backend
  if (self.newMessage.attachments && self.newMessage.attachments.length > 0) {
    var attachments = angular.copy(self.newMessage.attachments);
    for (var i = 0;i < attachments.length;i++) {
      self.ImapService.removeAttachment(attachments[i].attachmentId);
    }
  }
  // If it's an existing draft, remove it
  if (self.newMessage.seq && self.newMessage.messageId) {
    self.loading.start();
    var draftPath;
    if (self.specialBoxes.Drafts && self.specialBoxes.Drafts.path) {
      draftPath = self.specialBoxes.Drafts.path;
    } else {
      draftPath = "Drafts";
    }
    self.ImapService.removeMessage(self.newMessage.seq, self.newMessage.messageId, draftPath)
      .success(function(data, status, header){
        self.listBox(draftPath);
        self.loading.complete();
      })
      .error(function(data, status, header){
        self.loading.complete();
      })
  }
}

Message.prototype.resizeCompose = function(mode){
  var self = this;
  console.log(mode);
  self.composeMode = mode;
}

Message.prototype.showCc = function(){
  var self = this;
  self.cc = true;
}

Message.prototype.showBcc = function(){
  var self = this;
  self.bcc = true;
}

Message.prototype.uploadFiles = function(files, errFiles) {
  var self = this;
  angular.forEach(files, function(file) {
    console.log(file);
    var attachment = {
      filename : file.name,
      contentType : file.type,
      encoding : "base64",
      progress : "uploading"
    }
    self.newMessage.attachments.push(attachment);
    self.Upload.base64DataUrl(files)
      .then(function(b64){
        var data = b64[0].split(",")[1];
        self.ImapService.uploadAttachment(data)
          .then(function(result){
            lodash.some(self.newMessage.attachments, function(attachment){
              console.log(attachment);
              if (attachment.filename == file.name) {
                attachment.attachmentId = result.attachmentId;
                attachment.progress = "uploaded";
                console.log(self.newMessage.attachments);
              }
            })
          })
          .catch(function(data){
            lodash.some(self.newMessage.attachments, function(attachment){
              if (attachment.filename == file.filename) {
                attachment.progress = "failed";
              }
            })
            console.log(data);
          })
      })
  });
}


Message.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService", "$timeout", "Upload", "ToastrService"];

var module = require("./index");
module.controller("MessageCtrl", Message);
