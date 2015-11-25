'use strict';
var ContactService = function($http, localStorageService, $rootScope, $state, $q, Upload) {
  this.$http = $http;
  this.localStorageService = localStorageService;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$q = $q;
  this.Upload = Upload;
}

ContactService.prototype.getCandidates = function(canceler) {
  var self = this;
  if (self.$rootScope.getContactCandidatesCanceler) {
    self.$rootScope.getContactCandidatesCanceler.resolve();
  }
  self.$rootScope.getContactCandidatesCanceler = self.$q.defer();
  var promise = self.$q.defer();
  var path = "/api/1.0/contacts/candidates";
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
    req.timeout = self.$rootScope.getContactCandidatesCanceler.promise;
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

ContactService.prototype.getList = function(opts, canceler) {
  var self = this;
  var opts = opts || {};
  if (self.$rootScope.getContactListCanceler) {
    self.$rootScope.getContactListCanceler.resolve();
  }
  self.$rootScope.getContactListCanceler = self.$q.defer();
  var promise = self.$q.defer();
  var path = "/api/1.0/contacts?limit=10";
  if (opts.page) {
    path += "&page=" + opts.page;
  }
  if (opts.search) {
    path += "&q=" + opts.search;
  }
  if (opts.sortImportance) {
    path += "&sort=" + opts.sortImportance;
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
    req.timeout = self.$rootScope.getContactListCanceler.promise;
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

ContactService.prototype.get = function(id, canceler) {
  var self = this;
  if (self.$rootScope.getContactCanceler) {
    self.$rootScope.getContactCanceler.resolve();
  }
  self.$rootScope.getContactCanceler = self.$q.defer();
  var promise = self.$q.defer();
  var path = "/api/1.0/contact?id=" + id;
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
    req.timeout = self.$rootScope.getContactCanceler.promise;
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

ContactService.prototype.delete = function(id, canceler) {
  var self = this;
  if (self.$rootScope.deleteContactCanceler) {
    self.$rootScope.deleteContactCanceler.resolve();
  }
  self.$rootScope.deleteContactCanceler = self.$q.defer();
  var promise = self.$q.defer();
  var path = "/api/1.0/contact?id=" + id;
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
    req.timeout = self.$rootScope.deleteContactCanceler.promise;
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

ContactService.prototype.add = function(contact, canceler) {
  var self = this;
  if (self.$rootScope.addContactCanceler) {
    self.$rootScope.addContactCanceler.resolve();
  }
  self.$rootScope.addContactCanceler = self.$q.defer();
  var promise = self.$q.defer();
  var path = "/api/1.0/contact";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "POST",
    url : path,
    data : contact,
    headers : {
      token : token,
      username : username
    }
  }
  if (canceler) {
    req.timeout = self.$rootScope.addContactCanceler.promise;
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

ContactService.prototype.update = function(contact, canceler) {
  var self = this;
  if (self.$rootScope.updateContactCanceler) {
    self.$rootScope.updateContactCanceler.resolve();
  }
  self.$rootScope.updateContactCanceler = self.$q.defer();
  var promise = self.$q.defer();
  var path = "/api/1.0/contact";
  var token = self.localStorageService.get("token"); 
  var username = self.localStorageService.get("username"); 
  var req = {
    method: "PUT",
    url : path,
    data : contact,
    headers : {
      token : token,
      username : username
    }
  }
  if (canceler) {
    req.timeout = self.$rootScope.updateContactCanceler.promise;
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

ContactService.prototype.uploadAvatar = function(data, emailAddress) {
  var self = this;
  var path = "/api/1.0/avatar?emailAddress=" + emailAddress;
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
ContactService.prototype.getAvatar = function(emailAddress, canceler) {
  var self = this;
  var promise = self.$q.defer();
  if (self.$rootScope.getAvatarCanceler) {
    self.$rootScope.getAvatarCanceler.resolve();
  }
  self.$rootScope.getAvatarCanceler = self.$q.defer();
  var path = "/api/1.0/avatar?emailAddress=" + emailAddress;
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
    req.timeout = self.$rootScope.getAvatarCanceler.promise;
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


ContactService.inject = ["$http", "localStorageService", "$rootScope", "$state", "$q"];

var module = require("./index");
module.service("ContactService", ContactService);

