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
var Surelia = function ($scope, $rootScope, $state, $window, $stateParams, localStorageService, ImapService, ngProgressFactory, $compile, $timeout, Upload, ToastrService, $templateCache, $sce, $translate, ContactService, SettingsService, conf, $http){
  this.$scope = $scope;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$window = $window;
  this.localStorageService = localStorageService;
  this.$stateParams = $stateParams;
  this.ImapService = ImapService;
  this.ngProgressFactory = ngProgressFactory;
  this.$compile = $compile;
  this.$timeout = $timeout;
  this.Upload = Upload;
  this.ToastrService = ToastrService;
  this.$templateCache = $templateCache;
  this.$sce = $sce;
  this.$translate = $translate;
  this.ContactService = ContactService;
  this.SettingsService = SettingsService;
  this.conf = conf;
  this.$http = $http;
  var self = this;
  self.listView = "messages";
  self.list = "message";
  self.compose = false;
  self.composeMode = "corner";
  self.cc = false;;
  self.bcc = false;
  self.newMessage = {};
  self.currentMessage = {};
  self.contactCandidates = [];
  self.enableAutocomplete = true;
  self.nextSuggestion = true;
  self.currentAutocomplete = {};
  self.contactCandidatesAutocomplete = {};
  self.sortBy = null;
  self.sortImportance = "ascending";
  self.rawAvatar="";
  self.croppedAvatar="";
  self.showCropArea = false;
  self.spamBox = conf.spamFolder;
  self.loadBoxes = conf.loadBoxes;
  self.loadSpecialBoxes = conf.loadSpecialBoxes;

  // This array will be used in "Move to" submenu in multiselect action
  self.moveToBoxes = [];
  self.flags = ["Read", "Unread"];
  self.isAlpha = function(str) {
    return /^[a-zA-Z()]+$/.test(str);
  }
  self.loading = self.ngProgressFactory.createInstance();
  
  if (self.conf.domainLogoApi && self.conf.defaultDomainLogoPath) {
    self.defaultDomainLogo = self.conf.defaultDomainLogoPath;
    self.currentDomainLogo = self.defaultDomainLogo;
  }
  if (self.localStorageService.get("username")) {
    self.$rootScope.currentUsername = self.localStorageService.get("username");
    self.$rootScope.socket.emit("join", self.$rootScope.currentUsername);
    // Fetch domain logo
    if (self.conf.domainLogoApi && self.conf.defaultDomainLogoPath) {
      if (self.$scope.currentUsername.split('@')[1] != self.conf.mainDomain) {
        self.defaultDomainLogo = self.conf.defaultDomainLogoPath;
        self.$http({
          method: "GET",
          url : self.conf.domainLogoApi + self.$scope.currentUsername.split('@')[1]
        })
          .then(function(data, status){
            if (data && data.data) {
              return self.currentDomainLogo = "data:image/png;base64," + data.data;
            }
            self.currentDomainLogo = self.defaultDomainLogo;
          })
          .catch(function(data, status){
            self.currentDomainLogo = self.defaultDomainLogo;
          })
      } else {
        self.currentDomainLogo = self.defaultDomainLogo;
      }
    }
  }
  // getBoxes() and getSpecialBoxes are running in async
  // Make sure loading progress get completed 
  // if only both of those function are already completed.
  var loadCompletion = {
    boxes : false,
    specialBoxes : false
  }
  var loadComplete = function(){
    if (loadCompletion.boxes && loadCompletion.specialBoxes) {
      self.loading.complete();
    }
  }
  // Load basic information
  self.loading.set(20);
  // Get contact candidates for autocomplete
  self.ContactService.getCandidates()
  .then(function(data){
    console.log(data);
    self.contactCandidates = data;
  })
  .catch(function(data, status){
    self.ToastrService.parse(data, status);
  })
  self.ImapService.getBoxes()
  .success(function(data, status){
    console.log(data);
    loadCompletion.boxes = true;
    loadComplete();
    var opts = {
      limit : 10,
      page : 1,
    }
    self.listBox("INBOX", opts);
    self.currentBoxName = "INBOX";
    self.currentBoxPath = "INBOX";
    self.ToastrService.parse(data, status);
    // short boxes
    self.boxes = [];
    self.shortedBoxes = [];
    self.unshortedBoxes = [];
    var shortedEnums = ["inbox", "draft", "sent", "junk", "spam", "trash"];
    window.async.eachSeries(shortedEnums, function(boxName, cb){
      lodash.some(data, function(box){
        if (self.shortedBoxes.indexOf(box) < 0 && box.boxName.toLowerCase().indexOf(boxName) > -1) {
          self.shortedBoxes.push(box);
        }
      })
      cb();
    }, function(err){
      window.lodash.some(data, function(box) {
        if (self.shortedBoxes.indexOf(box) < 0 && self.unshortedBoxes.indexOf(box) < 0) {
          self.unshortedBoxes.push(box);
        }
      })
      self.boxes = self.shortedBoxes.concat(self.unshortedBoxes);
      /*
      Trash, Sent and Drafts has different message count definition.
       - Show no count in Trash and Sent box
       - Show total messages in Drafts
      */
      window.lodash.some(self.boxes, function(box){
        if (box && box.boxName && 
          (box.boxName.indexOf("Trash") > -1 || box.boxName.indexOf("Sent") > -1 )
        ) {
          box.meta.count = 0;
        } else if (box && box.boxName && box.boxName.indexOf("Drafts") > -1) {
          box.meta.count = box.meta.total;
        } else if (box && box.boxName && box.boxName.indexOf(self.spamBox) < 0) {
          // Add everything except Trash, Sent, Drafts and Spam box
          box.meta.count = box.meta.unseen;
          self.moveToBoxes.push(box.boxName);
        }
      });
    })
  })
  .error(function(data, status){
    console.log(data, status);
    loadCompletion.boxes = true;
    loadComplete();
    self.ToastrService.parse(data, status);
  })
  self.ImapService.getSpecialBoxes()
  .success(function(data, status){
    loadCompletion.boxes = true;
    loadComplete();
    self.specialBoxes = data;
    window.lodash.some(self.specialBoxes, function(box){
      if (!box.specialName || (box.specialName && box.specialName.length < 1)) {
        box.specialName = box.path;
      }
      if (box && box.specialName && 
        (box.specialName.indexOf("Trash") > -1 || box.specialName.indexOf("Sent") > -1 )
      ) {
        box.meta.count = 0;
      } else if (box && box.specialName && box.specialName.indexOf("Drafts") > -1) {
        box.meta.count = box.meta.total;
      } else {
        // Add everything except Trash, Sent and Drafts
        self.moveToBoxes.push(box.specialName);
      } 
    });
  })
  .error(function(data, status){
    console.log(data, status);
    loadCompletion.boxes = true;
    loadComplete();
    self.ToastrService.parse(data, status);
  })
  self.isValidEmail = function(emailString){
    var regExp = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))){2,6}$/i;
    return regExp.test(emailString);
  }

  self.quota = {
    usage: -1,
    limit: -1
  }
  self.ImapService.quotaInfo()
    .success(function(data, status) {
      self.quota.usage = data.usage * 1024;
      self.quota.limit = data.limit * 1024;
      self.quota.percentage = data.percentage;
    });

    // Autocomplete
    var suggest_email = function(term) {
      var q = term.toLowerCase().trim(),
          results = [];
  
      for (var i = 0; i < self.contactCandidates.length && results.length < 10; i++) {
        var a = self.contactCandidates[i];
        if (a.emailAddress && (a.emailAddress.toLowerCase().indexOf(q) == 0
          || a.name.toLowerCase().indexOf(q) == 0)
        ) {
          var label = a.name;
          if (label.length > 0) {
            label += " - " + a.emailAddress;
          } else {
            label = a.emailAddress;
          }
          results.push({ label: label, value: a.emailAddress });
        }
      }
      return results;
    }
    var suggest_email_delimited = function(term) {
      if (term.replace(/ /g,'')[term.length - 1] === ',') {
        return self.nextSuggestion = false;
      } else {
        self.nextSuggestion = true;
      }
      if (self.enableAutocomplete) {
        var ix = term.lastIndexOf(","),
            lhs = term.substring(0, ix + 1),
            rhs = term.substring(ix + 1),
            suggestions = suggest_email(rhs);
      
        suggestions.forEach(function (s) {
          s.value = lhs + s.value;
        });
        self.contactCandidatesAutocomplete[self.currentAutocomplete] = suggestions; 
        return suggestions;
      }
    };
    self.select_suggested = function(val, form) { 
      if (val.indexOf(',') > -1) {
        val = val.replace(/ /g,'').split(',')[val.split(',').length - 1];  
      }
      self.enableAutocomplete = false;
      var str = self.newMessage[form].split(",");
      var length = str.length;
      str = str.slice(0,length-1);
      str[str.length] = val;
      self.newMessage[form] = str.join(", ");
      self.clearAutocomplete();
      setTimeout(function(){
        self.enableAutocomplete = true;
      }, 1000)
    }
    self.option_delimited = {
      suggest: suggest_email_delimited,
    };
  // Socket event
  var attachmentReady = function(key) {
    console.log(key)
    for (var i in self.currentMessage.parsed.attachments) {
      if (self.currentMessage.parsed.attachments[i].key && self.currentMessage.parsed.attachments[i].key.toString() === key.toString()) {
        self.currentMessage.parsed.attachments[i].ready = true;
        self.$scope.$apply();
        break;
      }
    }
  }
  $rootScope.socket.on('attachmentReady', function(key){
    // Maximum estimated time until the message is loaded to DOM
    if (
      self.currentMessage && 
      self.currentMessage.parsed && 
      self.currentMessage.parsed.attachments && 
      self.currentMessage.parsed.attachments.length > 0
    ) {
      attachmentReady(key);
    } else {
      self.$timeout(function(){
        attachmentReady(key);
      }, 3000);
    }
  })
  $rootScope.socket.on('updateSeq', function(){
    console.log('Update sequence');
    self.listReload();
  })
}

Surelia.prototype.toggleMobileMenu = function() {
  var self = this;
  if (self.showMobileMenu) {
    self.showMobileMenu = false;
  } else {
    self.showMobileMenu = true;
  }
}

Surelia.prototype.clearAutocomplete = function(){
  var self = this;
  self.contactCandidatesAutocomplete = {};
} 

Surelia.prototype.switchLang = function(lang) {
  var self = this;
  self.$translate.use(lang);
}

Surelia.prototype.getBoxes = function(){
  var self = this;
  self.loading.start();
  console.log("boxes");
  self.ImapService.getBoxes()
    .success(function(data, status){
      self.loading.complete();
      console.log(data);
      self.ToastrService.parse(data, status);
      self.boxes = data;
    })
    .error(function(data, status){
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.listBoxNext = function(){
  var self = this;
  if (self.currentListMeta.next) {
    var opts = {
      limit : self.currentListMeta.limit,
      page : self.currentListMeta.page + 1,
    }
    var boxName = self.searchString ? "search" : self.currentBoxPath;
    opts.search = self.searchString ? self.searchString : null;
    opts.sortBy = self.sortBy;
    opts.sortImportance = self.sortImportance;
    opts.filter = self.filter;
    self.listBox(boxName, opts, true)
  }
}

Surelia.prototype.listBoxPrev = function(){
  var self = this;
  if (self.currentListMeta.prev) {
    var opts = {
      limit : self.currentListMeta.limit,
      page : self.currentListMeta.page - 1,
    }
    var boxName = self.searchString ? "search" : self.currentBoxPath;
    opts.search = self.searchString ? self.searchString : null;
    opts.sortBy = self.sortBy;
    opts.filter = self.filter;
    opts.sortImportance = self.sortImportance;
    self.listBox(boxName, opts, true)
  }
}

// @sort enums = ["DATE", "FROM", "SUBJECT", "SIZE"]
Surelia.prototype.listSort = function(sort){
  var self = this;
  var opts = {
    limit : self.currentListMeta.limit,
    page : self.currentListMeta.page,
  }
  var boxName = self.searchString ? "search" : self.currentBoxPath;
  opts.search = self.searchString ? self.searchString : null;
  opts.sortBy = self.sortBy = sort;
  opts.sortImportance = self.sortImportance;
  opts.filter = self.filter;
  self.listBox(boxName, opts, true);
}


// @importance "ascending" or "descending"
Surelia.prototype.listReverse = function(importance){
  var self = this;
  var opts = {
    limit : self.currentListMeta.limit,
    page : self.currentListMeta.page,
  }
  var boxName = self.searchString ? "search" : self.currentBoxPath;
  opts.search = self.searchString ? self.searchString : null;
  opts.sortBy = self.sortBy;
  opts.sortImportance = self.sortImportance = importance;
  opts.filter = self.filter;
  self.listBox(boxName, opts, true);
}

Surelia.prototype.listFilter = function(filter){
  var self = this;
  var opts = {
    limit : self.currentListMeta.limit,
    page : self.currentListMeta.page,
  }
  var boxName = self.searchString ? "search" : self.currentBoxPath;
  opts.search = self.searchString ? self.searchString : null;
  opts.sortBy = self.sortBy;
  opts.sortImportance = self.sortImportance;
  opts.filter = self.filter = filter;
  self.listBox(boxName, opts, true);
}

Surelia.prototype.listReload = function(){
  var self = this;
  var opts = {
    limit : self.currentListMeta.limit,
    page : self.currentListMeta.page,
  }
  var boxName = self.searchString ? "search" : self.currentBoxPath;
  opts.search = self.searchString ? self.searchString : null;
  opts.sortBy = self.sortBy;
  opts.sortImportance = self.sortImportance;
  opts.filter = self.filter;
  self.listBox(boxName, opts, true);
}

Surelia.prototype.listBox = function(boxName, opts, canceler){
  var self = this;
  var opts = opts || {};
  self.sortBy = opts.sortBy || null;
  self.filter = opts.filter || null;
  self.currentSelection = [];
  self.currentMessage = {};
  self.loading.start();
  self.listView = "messages";
  self.view = "message";
  self.selectAll = false;
  self.showMobileMenu = false;
  console.log("list box content");
  if (boxName.indexOf("Drafts") > -1) {
    self.isDraft = true;
  } else {
    self.isDraft = false;
  }
  // Set current box property
  var special = window.lodash.some(self.specialBoxes, function(box){
    if (!box.specialName || (box.specialName && box.specialName.length < 1)) {
      box.specialName = box.path;
    }
    if (box.path == boxName) {
      self.currentBoxName = box.specialName;
      self.currentBoxPath = box.path;
      return;
    } 
  });
  var box = window.lodash.some(self.boxes, function(box){
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
      // Simplify 
      window.lodash.some(self.currentList, function(msg){
        if (typeof msg.header.subject == "object") {
          msg.header.subject = msg.header.subject[0];
        }
      })
      self.$rootScope.pageTitle = boxName;
      // Assign message count
      window.lodash.some(self.specialBoxes, function(box){
        if (!box.specialName || (box.specialName && box.specialName.length < 1)) {
          box.specialName = box.path;
        }
        if (box.specialName.indexOf(boxName) >= 0 && 
          boxName.indexOf("Trash") < 0 && 
          boxName.indexOf("Sent") < 0
        ) {
          box.meta.count = data.meta.count;
          if (box.specialName.indexOf(self.currentBoxName) > -1) {
            self.$rootScope.pageTitle += ' (' + data.meta.count + ') ';
          }
          return;
        } 
      });
      window.lodash.some(self.boxes, function(box){
        if (box.boxName.indexOf(boxName) >= 0 &&
          boxName.indexOf("Trash") < 0 && 
          boxName.indexOf("Sent") < 0
        ) {
          box.meta.count = data.meta.count;
          if (box.boxName.indexOf(self.currentBoxName) > -1) {
            self.$rootScope.pageTitle += ' (' + data.meta.count + ')';
          }
          return;
        } 
      });
      self.$rootScope.pageTitle += ' - ' + self.$rootScope.currentUsername + ' - ' + self.conf.appName;
      // generate avatar, unread status
      opts.limit = opts.limit || 10;
      var colors = window.randomcolor({count:opts.limit, luminosity : "dark"});
      var assignedColor = [];
      for (var i in self.currentList) {
        var from = self.currentList[i].from || self.currentList[i].seq.toString();
        var hash = window.objectHash(from);
        var index = self.isAlpha(from) ? 0 : 1;
        self.currentList[i].avatar = from.toUpperCase();
        if (assignedColor.indexOf(hash) < 0) {
          assignedColor.push(hash);
          self.currentList[i].color = colors[assignedColor.indexOf(hash)];
        } else {
          self.currentList[i].color = colors[assignedColor.indexOf(hash)];
        }
        // Set flag state
        self.currentList[i].unread = false;
        self.currentList[i].answered = false;
        self.currentList[i].deleted = false;
        if (self.currentList[i].attributes.flags.indexOf("\\Seen") < 0) {
          self.currentList[i].unread = true;
        }
        if (self.currentList[i].attributes.flags.indexOf("\\Answered") >= 0) {
          self.currentList[i].answered = true;
        }
        if (self.currentList[i].attributes.flags.indexOf("\\Deleted") >= 0) {
          self.currentList[i].deleted = true;
        }
      }
      // Fetch avatar image
      window.lodash.some(self.currentList, function(message){
        if (message.parsed && 
        message.parsed.from && 
        message.parsed.from[0] && 
        message.parsed.from[0].address) {
          self.ContactService.getAvatar(message.parsed.from[0].address)
            .then(function(data, status){
              if (data.length > 0) {
                message.avatarImg = "data:image/png;base64," + data;
              }
            })
            // Do not catch error
        }
      })
      // calculate pagination nav
      var meta = self.currentListMeta;
      if ((meta.page - 1) > 0) {
        self.currentListMeta.prev = true;
      } else {
        self.currentListMeta.prev = false;
      }
      if (meta.limit * (meta.page +1) - meta.total < opts.limit) {
        self.currentListMeta.next = true;
      } else {
        self.currentListMeta.next = false;
      }
      if (meta.total > 0) {
        self.currentListMeta.listStart = (meta.page * meta.limit) - (meta.limit - 1);
      } else {
        self.currentListMeta.listStart = 0;
      }
      if (self.currentListMeta.listStart + meta.limit > meta.total) {
        self.currentListMeta.listEnd = meta.total;
      } else {
        self.currentListMeta.listEnd = self.currentListMeta.listStart + meta.limit - 1;
      }
    })
    .catch(function(data, status){
      self.loading.complete();
      self.ToastrService.parse(data, status);
      console.log(data, status);
    })
}

Surelia.prototype.addBox = function(boxName){
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
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.renameBox = function(boxName, newBoxName){
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
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.deleteBox = function(boxName){
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
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.retrieveMessage = function(id, boxName){
  var self = this;
  self.currentMessage = {};
  self.loading.start();
  console.log("retrieve message");
  var isUnread = lodash.some(self.currentList, function(message){
    return (message.seq == id && message.unread);
  })
  self.ImapService.retrieveMessage(id, boxName, true)
    .then(function(data){
      self.loading.complete();
      // If it is an unread message, decrease unread count in current box
      if (isUnread) {
        window.lodash.some(self.specialBoxes, function(box){
          if (!box.specialName || (box.specialName && box.specialName.length < 1)) {
            box.specialName = box.path;
          }
          if (box && box.specialName && box.specialName.indexOf(boxName) > -1) {
            box.meta.count--;
          } 
        });
        window.lodash.some(self.boxes, function(box){
          if (box && box.boxName && box.boxName.indexOf(boxName) > -1) {
            box.meta.count--;
          } 
        });
        // Set as already read
        window.lodash.some(self.currentList, function(message){
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
        self.currentMessage = data;
        self.currentMessage.seq = id;
        // Set flag state
        self.currentMessage.deleted = false;
        if (self.currentMessage.attributes.flags.indexOf("\\Deleted") >= 0) {
          self.currentMessage.deleted = true;
        }
        var html = "";
        if (self.currentMessage.parsed.html) {
          console.log("html");
          html = "<div>" + self.currentMessage.parsed.html + "</div>";
          // Assign inline attachment
          if (self.currentMessage.inlineAttachments && Object.keys(self.currentMessage.inlineAttachments).length > 0) {
            var inlineAttachments = self.currentMessage.inlineAttachments;
            var contentIds = html.split("src=\"cid:")
            contentIds.shift();
            html = html.replace(/src="cid:/g, "img src=\"data:image/png;base64,");
            for (var i in contentIds) {
              contentIds[i] = contentIds[i].split("\"")[0];
              html = html.replace(contentIds[i], inlineAttachments[contentIds[i]]);
            }
          }
        } else if (self.currentMessage.parsed.text) {
          console.log("text");
          html = "<pre>" + self.currentMessage.parsed.text + "</pre>";
        }

        // Add target="_system" attribute to each a tag
        html = html.replace(/ href=\"/g," target=\"_system\" href=\"")
        self.currentMessage.content = self.$sce.trustAsHtml(html);
        console.log(self.currentMessage.content);

        if (self.currentMessage.parsed.attachments && self.currentMessage.parsed.attachments.length > 0) {
          var attachments = self.currentMessage.parsed.attachments;
          for (var i = 0; i < attachments.length;i++) {
            self.currentMessage.parsed.attachments[i].index = i;
            self.currentMessage.parsed.attachments[i].size = attachments[i].length;
            window.lodash.some(mimeTypes, function(mime){
              var matched = window.lodash.some(mime.type, function(type){
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
        window.lodash.some(self.currentList, function(message){
          if (message.seq == id) {
            message.selected = true;
          } else {
            message.selected = false;
          }
        });
      }

      // Update seq in other client instance
      self.$rootScope.socket.emit("updateSeq", self.$rootScope.currentUsername);
    })
    .catch(function(data, status){
      self.loading.complete();
      self.ToastrService.parse(data, status);
      console.log(data, status);
    })
}

Surelia.prototype.getAttachment = function(attachment) {
  if (!attachment.ready) {
    return;
  }
  var self = this;
  var path = "/api/1.0/attachment/" + encodeURIComponent(attachment.fileName) + "?attachmentId=" + attachment.attachmentId + "&key=" + attachment.key;
  window.open(path,'_blank');
}

Surelia.prototype.logout = function(){
  var self = this;
  self.$rootScope.socket.emit("leave", self.$rootScope.currentUsername);
  self.ImapService.logout();
}

Surelia.prototype.sendMessage = function(msg){
  var self = this;
  // Attachment upload should be finished first
  var isUploading = window.lodash.some(msg.attachments, function(a){
    console.log(a);
    return (a.progress.status == "uploading");
  });
  if (isUploading) {
    return self.ToastrService.attachmentUploadNotFinishedYet();
  }
  // Remove unecessary child object
  window.lodash.some(msg.attachments, function(a) {
    delete(a.hover);
    delete(a.progress);
    delete(a.canceler);
  })
  self.clearAutocomplete();
  var msg = angular.copy(msg);
  // Recipients should not be empty
  if (!msg.recipients) {
    return self.ToastrService.emptyRecipients();
  }
  console.log("send message");
  var paths = {};
  if (self.specialBoxes.Drafts && self.specialBoxes.Drafts.path) {
    paths.draft = self.specialBoxes.Drafts.path;
  } else {
    paths.draft = "Drafts";
  }
  if (self.specialBoxes.Sent && self.specialBoxes.Sent.path) {
    paths.sent = self.specialBoxes.Sent.path;
  } else {
    paths.sent = "Sent";
  }
  msg.seq = msg.seq || undefined;
  // convert comma separated string to array, then check if they are a valid email
  if (msg.recipients && msg.recipients.length > 0) {
    msg.recipients = msg.recipients.replace(/ /g, "").split(",");
    for (var i in msg.recipients) {
      if (!self.isValidEmail(msg.recipients[i])) {
        return self.ToastrService.invalidEmailAddress(msg.recipients[i]);
      }
    }
  }
  if (msg.bcc && msg.bcc.length > 0) {
    msg.bcc = msg.bcc.replace(/ /g, "").split(",");
    for (var i in msg.bcc) {
      if (!self.isValidEmail(msg.bcc[i])) {
        return self.ToastrService.invalidEmailAddress(msg.bcc[i]);
      }
    }
  }
  if (msg.cc && msg.cc.length > 0) {
    msg.cc = msg.cc.replace(/ /g, "").split(",");
    for (var i in msg.cc) {
      if (!self.isValidEmail(msg.cc[i])) {
        return self.ToastrService.invalidEmailAddress(msg.cc[i]);
      }
    }
  }
  self.compose = false;
  self.loading.start();
  self.ImapService.sendMessage(msg, paths)
    .success(function(data){
      console.log(data);
      self.loading.complete();
      self.ToastrService.sent();
      // Remove it immediately from draft scope
      if (msg.seq && msg.isDraft) {
        window.lodash.remove(self.currentList, function(message){
          return message.seq == msg.seq;
        });
      }
      // Decrease draft count
      if (msg.isDraft) {
        window.lodash.some(self.boxes, function(box){
          if (box && box.boxName && box.boxName.indexOf("Drafts") > -1) {
            box.meta.count--;
            return;
          } 
        });
        window.lodash.some(self.specialBoxes, function(box){
          if (!box.specialName || (box.specialName && box.specialName.length < 1)) {
            box.specialName = box.path;
          }
          if (box && box.specialName && box.specialName.indexOf("Drafts") > -1) {
            box.meta.count--;
            return;
          } 
        });
      }
      // Set answered flag
      if (msg.isReply) {
        lodash.some(self.currentList, function(message){
          if (message.seq == msg.seq) {
            message.answered = true;
            return;
          }
        });
      }
      // Update seq in other client instance
      self.$rootScope.socket.emit("updateSeq", self.$rootScope.currentUsername);
       
    })
    .error(function(data, status){
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.removeMessage = function(seq, messageId, boxName){
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
      if (boxName.indexOf("Trash") > -1) {
        self.ToastrService.permanentlyDeleted();
      } else {
        self.ToastrService.deleted();
      }
      self.listReload();
      // Update seq in other client instance
      self.$rootScope.socket.emit("updateSeq", self.$rootScope.currentUsername);
    })
    .error(function(data, status){
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.composeMessage = function(message, action){
  var self = this;
  var msg = angular.copy(message);
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
  if (msg) {
    console.log(msg);
    self.newMessage.seq = msg.seq;
    self.newMessage.messageId = msg.parsed.messageId;
    // If there is a msg parameter and an action, then it is a reply / reply all / forward
    if (action && (action === "reply" || action === "all" || action === "forward")) {
      if (msg.parsed.html || msg.parsed.text) {
        var trimmed = self.$templateCache.get("trimmed-message.html");
        console.log(trimmed);
        var content = msg.parsed.text || window.html2text.fromString(msg.parsed.html);
        content = window.monowrap(window.htmlSpecialChars(content), {width:72,}).replace(new RegExp('\r?\n','g'), '<br>');
        console.log(content);
        self.newMessage.html = trimmed.replace("CONTENT", content)
                                .replace("DATE", msg.parsed.date)
                                .replace("ADDRESS", msg.parsed.from[0].address);
        console.log(self.newMessage.html);
      }
      if (msg.parsed.subject && action == "forward") {
        self.newMessage.subject = "Fwd: " + msg.parsed.subject;
        // If there are attachments, 
        if (msg.parsed.attachments && msg.parsed.attachments.length > 0) {
          for(var i in msg.parsed.attachments) {
            var a = {
              filename : msg.parsed.attachments[i].fileName,
              contentType : msg.parsed.attachments[i].contentType,
              progress : { status : "uploaded" },
              attachmentId : msg.parsed.attachments[i].attachmentId
            }
            self.newMessage.attachments.push(a);
          }
        }
        self.newMessage.isForward = true;
      } else {
        self.newMessage.subject = "Re: " + msg.parsed.subject;
        if (msg.parsed.from && msg.parsed.from.length > 0) {
          for(var i in msg.parsed.from) {
            if (self.newMessage.recipients.length > 0) {
              self.newMessage.recipients += ",";
            }
            self.newMessage.recipients += msg.parsed.from[i].address; 
          }
          if (action == "all") {
            for(var i in msg.parsed.cc) {
              if (msg.parsed.cc[i].address !== self.$rootScope.currentUsername) {
                if (self.newMessage.recipients.length > 0) {
                  self.newMessage.recipients += ",";
                }
                self.newMessage.recipients += msg.parsed.cc[i].address; 
              }
            }
            for(var i in msg.parsed.to) {
              if (msg.parsed.to[i].address !== self.$rootScope.currentUsername) {
                if (self.newMessage.recipients.length > 0) {
                  self.newMessage.recipients += ",";
                }
                self.newMessage.recipients += msg.parsed.to[i].address; 
              }
            }
          }
          // This variables are needed in the backend to flag the current replied message as Answered
          self.newMessage.isReply = true;
          self.newMessage.boxName = msg.boxName;
        }
      }
    // Or a draft
    } else {
      if (msg.parsed.html) {
        self.newMessage.html = msg.parsed.html;
      }
      if (msg.parsed.subject) {
        self.newMessage.subject = msg.parsed.subject;
      }
      self.newMessage.isDraft = true;
      if (msg.parsed.to && msg.parsed.to.length > 0) {
        for(var i in msg.parsed.to) {
          if (self.newMessage.recipients.length > 0) {
            self.newMessage.recipients += ",";
          }
          self.newMessage.recipients += msg.parsed.to[i].address; 
        }
      }
      if (msg.parsed.cc && msg.parsed.cc.length > 0) {
        self.cc = true;
        for(var i in msg.parsed.cc) {
          if (self.newMessage.cc.length > 0) {
            self.newMessage.cc += ",";
          }
          self.newMessage.cc += msg.parsed.cc[i].address; 
        }
      }
      if (msg.parsed.bcc && msg.parsed.bcc.length > 0) {
        self.bcc = true;
        for(var i in msg.parsed.bcc) {
          if (self.newMessage.bcc.length > 0) {
            self.newMessage.bcc += ",";
          }
          self.newMessage.bcc += msg.parsed.bcc[i].address; 
        }
      }
      // Prepare the attachments
      if (msg.parsed.attachments && msg.parsed.attachments.length > 0) {
        for(var i in msg.parsed.attachments) {
          var a = {
            filename : msg.parsed.attachments[i].fileName,
            contentType : msg.parsed.attachments[i].contentType,
            encoding : "base64",
            progress : { status : "uploaded" },
            attachmentId : msg.parsed.attachments[i].attachmentId
          }
          self.newMessage.attachments.push(a);
        }
      }
    }
  }
  // Get the hash. It needed for comparing the draft later
  var obj = angular.copy(self.newMessage);
  self.currentMessageHash = window.objectHash(obj);
  console.log(self.currentMessageHash);
}

Surelia.prototype.saveDraft = function(){
  var self = this;
  var isUploading = window.lodash.some(self.newMessage.attachments, function(a){
    console.log(a);
    return (a.progress.status == "uploading");
  });
  if (isUploading) {
    return self.ToastrService.attachmentUploadNotFinishedYet();
  }
  self.clearAutocomplete();
  self.compose = false;
  // Remove unecessary child object
  window.lodash.some(self.newMessage.attachments, function(a) {
    delete(a.hover);
  });
  var msg = angular.copy(self.newMessage);
  var newHash = window.objectHash(msg);
  console.log(newHash);
  // Save as draft if it has modified
  if (newHash !== self.currentMessageHash) {
    self.loading.start();
    console.log("save draft");
    var draftPath;
    if (self.specialBoxes.Drafts && self.specialBoxes.Drafts.path) {
      draftPath = self.specialBoxes.Drafts.path;
    } else {
      draftPath = "Drafts";
    }
    // convert comma separated string to array
    if (msg.recipients && msg.recipients.length > 0) {
      msg.recipients = msg.recipients.replace(/ /g, "").split(",");
    }
    if (msg.bcc && msg.recipients.length > 0) {
      msg.bcc = msg.bcc.replace(/ /g, "").split(",");
    }
    if (msg.cc && msg.recipients.length > 0) {
      msg.cc = msg.cc.replace(/ /g, "").split(",");
    }
    self.ImapService.saveDraft(msg, draftPath)
      .success(function(data, status, header){
        self.ToastrService.savedAsDraft();
        // If it's an existing draft, remove the old one
        if (msg.seq && msg.messageId && !msg.isReply && !msg.isForward) {
          self.ImapService.removeMessage(msg.seq, msg.messageId, draftPath)
            .success(function(data, status, header){
              self.listBox(draftPath, {}, true);
            })
            .error(function(data, status, header){
              self.loading.complete();
              self.ToastrService.parse(data, status);
            })
        } else {
          self.listBox(draftPath, {}, true);
          // Increase draft count
          window.lodash.some(self.boxes, function(box){
            if (box && box.boxName && box.boxName.indexOf("Drafts") > -1) {
              box.meta.count++;
              return;
            } 
          });
          window.lodash.some(self.specialBoxes, function(box){
            if (!box.specialName || (box.specialName && box.specialName.length < 1)) {
              box.specialName = box.path;
            }
            if (box && box.specialName && box.specialName.indexOf("Drafts") > -1) {
              box.meta.count++;
              return;
            } 
          });
        }
        // Update seq in other client instance
        self.$rootScope.socket.emit("updateSeq", self.$rootScope.currentUsername);
      })
      .error(function(data, status, header){
        self.loading.complete();
        self.ToastrService.parse(data, status);
      })
  }
}
Surelia.prototype.discardDraft = function(id){
  var self = this;
  self.clearAutocomplete();
  self.compose = false;
  // Remove temporary attachments in surelia backend
  if (self.newMessage.attachments && self.newMessage.attachments.length > 0) {
    var attachments = angular.copy(self.newMessage.attachments);
    for (var i = 0;i < attachments.length;i++) {
      self.ImapService.removeAttachment(attachments[i].attachmentId);
    }
  }
  // If it's an existing draft, remove it
  if (self.newMessage.seq && self.newMessage.messageId && self.newMessage.isDraft) {
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
        // Update seq in other client instance
        self.$rootScope.socket.emit("updateSeq", self.$rootScope.currentUsername);
      })
      .error(function(data, status, header){
        self.loading.complete();
        self.ToastrService.parse(data, status);
      })
  }
  self.newMessage = {};
}

Surelia.prototype.resizeCompose = function(mode){
  var self = this;
  console.log(mode);
  self.composeMode = mode;
}

Surelia.prototype.showCc = function(){
  var self = this;
  self.cc = true;
}

Surelia.prototype.showBcc = function(){
  var self = this;
  self.bcc = true;
}

Surelia.prototype.cancelAttachment = function(a, index){
  var self = this;
  a.canceler.resolve();
  self.newMessage.attachments.splice(index,1);
}

Surelia.prototype.uploadFiles = function(files, errFiles) {
  var self = this;
  angular.forEach(files, function(file) {
    console.log(file);
    var attachment = {
      filename : file.name,
      contentType : file.type,
      encoding : "base64",
      progress :{
        status : "uploading",
      }
    }
    self.ImapService.uploadAttachment(file, function(canceler){
      attachment.canceler = canceler;
      self.newMessage.attachments.push(attachment);
    })
      .then(function(res){
        var result = res.data;
        window.lodash.some(self.newMessage.attachments, function(attachment){
          console.log(attachment);
          if (attachment.filename == file.name) {
            attachment.attachmentId = result.attachmentId;
            attachment.progress.status = "uploaded";
            console.log(self.newMessage.attachments);
          }
        })
      }, function(res){
        if (attachment.progress.percentage != 100 && res.data != null && res.status < 0) {
          self.ToastrService.parse(res.data, res.status);
        }
        window.lodash.some(self.newMessage.attachments, function(attachment){
          if (attachment.fileName === file.filename && attachment.progress.status === "uploading") {
            attachment.progress.status = "failed";
          }
        })
        console.log(data);
      }, function(evt){
        console.log(evt);
        attachment.progress.percentage = parseInt(100 * evt.loaded / evt.total);
      })
  });
}

Surelia.prototype.checkAll = function(){
  var self = this;
  if (self.selectAll) {
    self.currentSelection = angular.copy(self.currentList);
  } else {
    self.currentSelection = [];
  }
}

Surelia.prototype.checkAllContacts = function(){
  var self = this;
  if (self.selectAll) {
    self.currentContactSelection = angular.copy(self.currentContactList);
  } else {
    self.currentContactSelection = [];
  }
}

Surelia.prototype.markAsSpam = function(){
  var self = this;
  var messageIds = [self.currentMessage.parsed.messageId]
  var seqs = [self.currentMessage.seq];
  var boxName = self.spamBox;
  var oldBoxName = self.currentBoxPath;
  self.ImapService.moveMessage(seqs, messageIds, oldBoxName, boxName)
    .then(function(data, status) {
      self.listReload();
    })
    .catch(function(data, status) {
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.archive = function(){
  var self = this;
  var messageIds = [self.currentMessage.parsed.messageId]
  var seqs = [self.currentMessage.seq];
  var boxName = 'Archives';
  var oldBoxName = self.currentBoxPath;
  self.ImapService.moveMessage(seqs, messageIds, oldBoxName, boxName)
    .then(function(data, status) {
      self.listReload();
    })
    .catch(function(data, status) {
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}


Surelia.prototype.notSpam = function(){
  var self = this;
  var messageIds = [self.currentMessage.parsed.messageId]
  var seqs = [self.currentMessage.seq];
  var boxName = "INBOX";
  var oldBoxName = self.spamBox;
  self.ImapService.moveMessage(seqs, messageIds, oldBoxName, boxName)
    .then(function(data, status) {
      self.listReload();
    })
    .catch(function(data, status) {
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.moveMessage = function(boxName) {
  var self = this;
  // Collect seq number
  var seqs = [];
  var messageIds = [];
  window.lodash.some(self.currentSelection, function(msg){
    if (msg.seq && msg.header['message-id'][0]) {
      seqs.push(msg.seq);
      messageIds.push(msg.header['message-id'][0]);
    }
  });
  if (self.currentBoxName.indexOf(boxName) > -1) {
    return self.ToastrService.couldntMoveToSameBox();
  }
  if (seqs.length < 1) {
    return self.ToastrService.messageSelectionEmpty();
  }
  self.loading.start();
  var oldBoxName = self.currentBoxName;
  console.log(seqs, oldBoxName, boxName);
  self.ImapService.moveMessage(seqs, messageIds, oldBoxName, boxName)
    .then(function(data, status){
      self.listReload();
      // Update seq in other client instance
      self.$rootScope.socket.emit("updateSeq", self.$rootScope.currentUsername);
    })
    .catch(function(data, status){
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.flagMessage = function(flag) {
  var self = this;
  // Collect seq number
  var seqs = [];
  window.lodash.some(self.currentSelection, function(msg){
    if (msg.seq) {
      seqs.push(msg.seq);
    }
  });
  if (self.currentBoxName.indexOf(boxName) > -1) {
    return self.ToastrService.couldntMoveToSameBox();
  }
  if (seqs.length < 1) {
    return self.ToastrService.messageSelectionEmpty();
  }
  self.loading.start();
  var boxName = self.currentBoxName;
  self.ImapService.flagMessage(seqs, flag, boxName)
    .then(function(data, status){
      self.listReload();
      // Update seq in other client instance
      self.$rootScope.socket.emit("updateSeq", self.$rootScope.currentUsername);
    })
    .catch(function(data, status){
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.retrieveContact = function(id){
  var self = this;
  self.loading.start();
  self.ContactService.get(id, true)
    .then(function(data){
      self.view = "contact";
      console.log(data);
      self.contactForm = false;
      self.currentContact = data;
      // grab the current Contact avatar color and letter;
      window.lodash.some(self.currentContactList, function(contact){
        if (contact.emailAddress && contact.emailAddress == self.currentContact.emailAddress){
          self.currentContact.color = contact.color;
          self.currentContact.avatar = contact.avatar;
        }
      })
      if (self.currentContact.avatarId && self.currentContact.emailAddress) {
        self.ContactService.getAvatar(self.currentContact.emailAddress)
          .then(function(data, status){
            if (data.length > 0) {
              self.currentContact.avatarImg = "data:image/png;base64," + data;
            }
            self.loading.complete();
          })
          .catch(function(data, status){
            self.loading.complete();
          })
          // Do not catch error
      } else {
        self.loading.complete();
      }
    })
    .catch(function(data, status){
      self.ToastrService.parse(data, status);
      self.loading.complete();
    })
}
Surelia.prototype.listContactNext = function(){
  var self = this;
  if (self.currentListMeta.next) {
    var opts = {
      limit : self.currentListMeta.limit,
      page : self.currentListMeta.page + 1,
    }
    opts.search = self.searchString ? self.searchString : null;
    opts.sortImportance = self.sortImportance;
    self.listContact(opts, true)
  }
}

Surelia.prototype.listContactPrev = function(){
  var self = this;
  if (self.currentListMeta.prev) {
    var opts = {
      limit : self.currentListMeta.limit,
      page : self.currentListMeta.page - 1,
    }
    opts.search = self.searchString ? self.searchString : null;
    opts.sortImportance = self.sortImportance;
    self.listContact(opts, true)
  }
}

// @importance "ascending" or "descending"
Surelia.prototype.listContactReverse = function(importance){
  var self = this;
  var opts = {
    limit : self.currentListMeta.limit,
    page : self.currentListMeta.page,
  }
  opts.search = self.searchString ? self.searchString : null;
  opts.sortImportance = self.sortImportance = importance;
  self.listContact(opts, true);
}

Surelia.prototype.listContactReload = function(){
  var self = this;
  var opts = {
    limit : self.currentListMeta.limit,
    page : self.currentListMeta.page,
  }
  opts.search = self.searchString ? self.searchString : null;
  opts.sortImportance = self.sortImportance;
  self.listContact(opts, true);
}

Surelia.prototype.listContact = function(opts, canceler){
  var self = this;
  self.$rootScope.pageTitle = 'Contact - ' + self.$rootScope.currentUsername + ' - ' + self.conf.appName;
  var opts = opts || {};
  console.log(opts);
  if (!opts.search) {
    self.searchString = null;
  }
  self.showMobileMenu = false;
  self.currentBoxName = "";
  self.currentBoxPath = "";
  self.sortBy = opts.sortBy || null;
  self.currentContactSelection = [];
  self.currentContact = {};
  self.currentContactForm = {};
  self.currentContactFormMode = "";
  self.loading.start();
  self.listView = "contacts";
  self.view = "";
  self.selectAll = false;
  self.contactForm = false;
  console.log("list contacts");
  self.ContactService.getList(opts, true)
    .then(function(data){
      self.loading.complete();
      console.log(data);
      self.currentContactList = data.data;
      self.currentListMeta = data.meta;
      // generate avatar, unread status
      opts.limit = opts.limit || 10;
      var colors = window.randomcolor({count:opts.limit, luminosity : "dark"});
      var assignedColor = [];
      for (var i in self.currentContactList) {
        var str = self.currentContactList[i].emailAddress || self.currentContactList[i]._id.toString();
        var hash = window.objectHash(str);
        if (self.currentContactList[i].name.length > 0) {
          var index = self.isAlpha(self.currentContactList[i].name[0]) ? 0 : 1;
          self.currentContactList[i].avatar = self.currentContactList[i].name[index].toUpperCase();
        } else {
          var index = self.isAlpha(self.currentContactList[i].emailAddress[0]) ? 0 : 1;
          self.currentContactList[i].avatar = self.currentContactList[i].emailAddress[index].toUpperCase();
        }
        if (assignedColor.indexOf(hash) < 0) {
          assignedColor.push(hash);
          self.currentContactList[i].color = colors[assignedColor.indexOf(hash)];
        } else {
          self.currentContactList[i].color = colors[assignedColor.indexOf(hash)];
        }
      }
      // Fetch avatar image
      window.lodash.some(self.currentContactList, function(contact){
        self.ContactService.getAvatar(contact.emailAddress)
          .then(function(data, status){
            if (data.length > 0) {
              contact.avatarImg = "data:image/png;base64," + data;
            }
          })
          // Do not catch error
      })
      // calculate pagination nav
      var meta = self.currentListMeta;
      if ((meta.page - 1) > 0) {
        self.currentListMeta.prev = true;
      } else {
        self.currentListMeta.prev = false;
      }
      if (meta.limit * (meta.page +1) - meta.total < opts.limit) {
        self.currentListMeta.next = true;
      } else {
        self.currentListMeta.next = false;
      }
      if (meta.total > 0) {
        self.currentListMeta.listStart = (meta.page * meta.limit) - (meta.limit - 1);
      } else {
        self.currentListMeta.listStart = 0;
      }
      if (self.currentListMeta.listStart + meta.limit > meta.total) {
        self.currentListMeta.listEnd = meta.total;
      } else {
        self.currentListMeta.listEnd = self.currentListMeta.listStart + meta.limit - 1;
      }
      
    })
    .catch(function(data, status){
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.addContact = function(contact) {
  var self = this;
  self.loading.start();
  self.ContactService.add(contact)
    .then(function(data){
      console.log(data);
      self.loading.complete();
      self.contactForm = false;
      self.listContactReload();
      self.retrieveContact(data._id);
      self.ToastrService.successfullyAddContact();
    })
    .catch(function(data, status){
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.batchDeleteContact = function(){
  var self = this;
  var ids = "";
  window.lodash.some(self.currentContactSelection, function(c){
    if (ids.length > 0) {
      ids += ",";
    }
    ids += c._id;
  })
  self.deleteContact(ids);
}
Surelia.prototype.deleteContact = function(ids) {
  var self = this;
  self.loading.start();
  self.ContactService.delete(ids)
    .then(function(data){
      console.log(data);
      self.loading.complete();
      self.contactForm = false;
      self.listContactReload();
      self.ToastrService.successfullyDeleteContact();
    })
    .catch(function(data, status){
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}
Surelia.prototype.updateContact = function(contact) {
  var self = this;
  delete(contact.avatarId);
  delete(contact.avatar);
  self.loading.start();
  self.ContactService.update(contact)
    .then(function(data){
      console.log(data);
      self.loading.complete();
      self.contactForm = false;
      self.listContactReload();
      self.retrieveContact(contact._id);
      self.ToastrService.successfullyUpdateContact();
    })
    .catch(function(data, status){
      console.log(data, status);
      self.loading.complete();
      self.ToastrService.parse(data, status);
    })
}

Surelia.prototype.editContact = function(){
  var self = this;
  self.currentContactForm = angular.copy(self.currentContact);
  self.contactForm = true;
  self.contactFormMode = "edit";
}
Surelia.prototype.newContact = function(){
  var self = this;
  self.view = "contact";
  self.currentContactForm = {};
  self.contactForm = true;
  self.contactFormMode = "add";
}
Surelia.prototype.discardEditContact = function(){
  var self = this;
  self.currentContactForm = {};
  self.contactForm = false;
}

Surelia.prototype.cropAvatar = function(files, errFiles) {
  var self = this;
  var reader = new FileReader();
  reader.onload = function(evt){
    self.showCropArea = true;
    self.$scope.$apply(function($scope){
      self.rawAvatar = evt.target.result;
    })
  }
  reader.readAsDataURL(files[files.length-1]);
}

Surelia.prototype.cancelCropAvatar = function(){
  var self = this;
  self.showCropArea = false;
  self.rawAvatar="";
  self.croppedAvatar="";
}

Surelia.prototype.uploadAvatar = function(){
  var self = this;
  self.loading.start();
  self.ContactService.uploadAvatar(self.croppedAvatar, self.currentContact.emailAddress)
    .then(function(data, status){
      self.showCropArea = false;
      self.rawAvatar="";
      self.croppedAvatar="";
      var currentUpdatedId = self.currentContact._id;
      self.loading.complete();
      self.listContactReload();
      // Let's wait listContact() to clear self.currentContact first;
      self.$timeout(function(){
        self.retrieveContact(currentUpdatedId);
      }, 500)
    }) 
    .catch(function(data, status){
      self.loading.complete();
      self.ToastrService.parse(data, status);
    }) 
}

Surelia.prototype.setPassword = function(username, pwd){
  var self = this;
  if (!pwd.oldPassword) {
    self.ToastrService.oldPasswordMustBeFilled();
    return;
  }
  if (pwd.newPassword !== pwd.confirmNewPassword) {
    self.ToastrService.setPasswordConfirmDoesNotMatch();
    return;
  }
  self.loading.start();
  self.SettingsService.setPassword(username, pwd.oldPassword, pwd.newPassword)
    .then(function(data, status){
      self.loading.complete();
      if (data.result) {
        self.pwd = {};
        self.ToastrService.setPasswordSucceeded();
      } else if (!data.result) {
        self.ToastrService.setPasswordFailed();
      }
    })
    .catch(function(data, status){
      self.loading.complete();
      self.ToastrService.parse(data, status);
    }) 
}


Surelia.inject = [ "$scope", "$rootScope", "$state", "$window", "$stateParams", "localStorageService", "$timeout", "Upload", "ToastrService", "$sce", "$translate", "ContactService", "SettingService", "conf", "$http"];

var module = require("./index");
module.controller("SureliaCtrl", Surelia);
