'use strict';
var ImapService = function($http, localStorageService, $rootScope, $state, $q, Upload) {
  this.$http = $http;
  this.localStorageService = localStorageService;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$q = $q;
  this.Upload = Upload;
}

ImapService.prototype.auth = function(credential, canceler) {
  var self = this;
  if (self.$rootScope.authCanceler) {
    self.$rootScope.authCanceler.resolve();
  }
  self.$rootScope.authCanceler = self.$q.defer();
  var promise = self.$q.defer();
  var path = "/api/1.0/auth";
  var req = {
    method: "POST",
    url : path,
    data : credential
  }
  if (canceler) {
    req.timeout = self.$rootScope.authCanceler.promise;
  }
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
    self.$rootScope.isLoggedIn = true;
    self.localStorageService.set("token", data.token); 
    self.localStorageService.set("username", credential.username);
    self.$rootScope.currentUsername = credential.username;
  })
  .error(function(data, status, headers) {
    self.$rootScope.isLoggedIn = false;
    promise.reject(data, status);
  });
  return promise.promise;
}
ImapService.prototype.getBoxes = function() {
  var self = this;
  var path = "/api/1.0/boxes";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "GET",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}
ImapService.prototype.getSpecialBoxes = function() {
  var self = this;
  var path = "/api/1.0/special-boxes";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "GET",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.listBox = function(boxName, opts, canceler) {
  var self = this;
  var promise = self.$q.defer();
  if (self.$rootScope.listBoxCanceler) {
    self.$rootScope.listBoxCanceler.resolve();
  }
  self.$rootScope.listBoxCanceler = self.$q.defer();
  var path = "/api/1.0/list-box?boxName=" + boxName;
  if (opts.limit && opts.limit !== undefined) {
    path += "&limit=" + opts.limit;
  }
  if (opts.page && opts.page !== undefined) {
    path += "&page=" + opts.page;
  }
  if (opts.search && opts.search !== undefined) {
    path += "&search=" + opts.search;
  }
  if (opts.sortBy && opts.sortBy !== undefined) {
    path += "&sortBy=" + opts.sortBy;
  }
  if (opts.sortImportance && opts.sortImportance !== undefined) {
    path += "&sortImportance=" + opts.sortImportance;
  }
  if (opts.filter && opts.filter !== undefined) {
    path += "&filter=" + opts.filter;
  }

  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "GET",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  if (canceler) {
    req.timeout = self.$rootScope.listBoxCanceler.promise;
  }
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data, status); 
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.addBox = function(boxName) {
  var self = this;
  var path = "/api/1.0/box?boxName=" + boxName;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.renameBox = function(boxName, newBoxName) {
  var self = this;
  var path = "/api/1.0/rename-box?boxName=" + boxName + "&newBoxName=" + newBoxName;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.deleteBox = function(boxName) {
  var self = this;
  var path = "/api/1.0/box?boxName=" + boxName;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "DELETE",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.retrieveMessage = function(id, boxName, canceler) {
  var self = this;
  var promise = self.$q.defer();
  if (self.$rootScope.retrieveMessageCanceler) {
    self.$rootScope.retrieveMessageCanceler.resolve();
  }
  self.$rootScope.retrieveMessageCanceler = self.$q.defer();
  var path = "/api/1.0/message?id=" + id + "&boxName=" + boxName;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "GET",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  if (canceler) {
    req.timeout = self.$rootScope.retrieveMessageCanceler.promise;
  }
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data, status); 
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.getAttachment = function(attachmentId, key, canceler) {
  var self = this;
  var promise = self.$q.defer();
  if (self.$rootScope.getAttachmentCanceler) {
    self.$rootScope.getAttachmentCanceler.resolve();
  }
  self.$rootScope.getAttachmentCanceler = self.$q.defer();
  var path = "/api/1.0/attachment?attachmentId=" + attachmentId + "&key=" + key;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "GET",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  if (canceler) {
    req.timeout = self.$rootScope.getAttachmentCanceler.promise;
  }
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data, status); 
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.uploadAttachment = function(data) {
  var self = this;
  var path = "/api/1.0/attachment";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username");
  var req = {
    url : path,
    data : {content : data},
    headers : {
      token : token,
      username : username
    }
  }
  return self.Upload.upload(req)
}

ImapService.prototype.removeAttachment = function(attachmentId, canceler) {
  var self = this;
  console.log("Removing");
  var promise = self.$q.defer();
  if (self.$rootScope.removeAttachmentCanceler) {
    self.$rootScope.removeAttachmentCanceler.resolve();
  }
  self.$rootScope.removeAttachmentCanceler = self.$q.defer();
  var path = "/api/1.0/attachment?attachmentId=" + attachmentId;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "DELETE",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  if (canceler) {
    req.timeout = self.$rootScope.removeAttachmentCanceler.promise;
  }
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data, status); 
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}


ImapService.prototype.moveMessage = function(seqs, oldBoxName, boxName) {
  var self = this;
  // Convert to comma separated string
  var data = {
    seqs : seqs,
    oldBoxName : oldBoxName,
    boxName : boxName
  }
  var path = "/api/1.0/move-message";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    data : data,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.removeMessage = function(seq, messageId, boxName) {
  var self = this;
  var path = "/api/1.0/message?seqs=" + seq + "&messageId=" + encodeURIComponent(messageId) + "&boxName=" + boxName;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "DELETE",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.newMessage = function(newMessage) {
  var self = this;
  var path = "/api/1.0/message";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    data : newMessage,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.logout = function() {
  var self = this;
  var username = self.localStorageService.get("username"); 
  var token = self.localStorageService.get("token"); 
  self.$rootScope.isLoggedIn = false;
  self.localStorageService.remove("username"); 
  self.localStorageService.remove("token");
  self.$state.go("Login");
  var path = "/api/1.0/logout";
  var req = {
    method: "GET",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}
/**
 * Send message
 *
 */

ImapService.prototype.sendMessage = function(msg, paths) {
  var self = this;
  var path = "/api/1.0/send?sentPath=" + paths.sent + "&draftPath=" + paths.draft;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    data : msg,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.saveDraft= function(msg, draftPath) {
  var self = this;
  var path = "/api/1.0/draft?draftPath=" + draftPath;
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    data : msg,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.quotaInfo = function(boxName) {
  var self = this;
  var path = "/api/1.0/quota-info";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "GET",
    url : path,
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.prototype.flagMessage = function(seqs, flag, boxName) {
  var self = this;
  var path = "/api/1.0/set-flag";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    data : {
      seqs : seqs,
      flag : flag,
      boxName : boxName
    },
    headers : {
      token : token,
      username : username
    }
  }
  return self.$http(req)
}

ImapService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q"];

var module = require("./index");
module.service("ImapService", ImapService);

