'use strict';
var ImapService = function($http, localStorageService, $rootScope, $state, $q) {
  this.$http = $http;
  this.localStorageService = localStorageService;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$q = $q;
  var self = this; 
}

ImapService.prototype.auth = function(credential) {
  var self = this;
  self.localStorageService.set("username", credential.username); 
  var promise = self.$q.defer();
  var path = "/api/1.0/auth";
  var req = {
    method: "POST",
    url : path,
    data : credential
  }
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
    self.localStorageService.set("token", data); 
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}
ImapService.prototype.getBoxes = function() {
  var self = this;
  var promise = self.$q.defer();
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}
ImapService.prototype.getSpecialBoxes = function() {
  var self = this;
  var promise = self.$q.defer();
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.listBox = function(boxName) {
  var self = this;
  var promise = self.$q.defer();
  var path = "/api/1.0/list-box?boxName=" + boxName;
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.addBox = function(boxName) {
  var self = this;
  var promise = self.$q.defer();
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.renameBox = function(boxName, newBoxName) {
  var self = this;
  var promise = self.$q.defer();
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.deleteBox = function(boxName) {
  var self = this;
  var promise = self.$q.defer();
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.retrieveMessage = function(id, boxName) {
  var self = this;
  var promise = self.$q.defer();
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.moveMessage = function(id, boxName, newBoxName) {
  var self = this;
  var promise = self.$q.defer();
  var path = "/api/1.0/move-message?id=" + id + "&boxName=" + boxName + "&newBoxName=" + newBoxName;;
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.deleteMessage = function(id, boxName) {
  var self = this;
  var promise = self.$q.defer();
  var path = "/api/1.0/message?id=" + id + "&boxName=" + boxName;
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.newMessage = function(newMessage) {
  var self = this;
  var promise = self.$q.defer();
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.logout = function() {
  var self = this;
  var promise = self.$q.defer();
  var path = "/api/1.0/logout";
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
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.prototype.sendMessage = function(msg) {
  var self = this;
  var promise = self.$q.defer();
  var path = "/api/1.0/send";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    data : msg,
  }
  self.$http(req)
  .success(function(data, status, headers) {
    promise.resolve(data);
  })
  .error(function(data, status, headers) {
    promise.reject(data, status);
  });
  return promise.promise;
}

ImapService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q"];

angular.module('imapService', [])
.service("ImapService", ImapService)

