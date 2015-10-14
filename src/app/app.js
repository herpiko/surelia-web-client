'use strict';

var app = angular.module("App", [
  "ui.router", 
  "ui.bootstrap",
  "ngAnimate",
  "html",
  "LocalStorageModule",
])
app.config(function($stateProvider) {
  $stateProvider
  .state("start", {
      url: "/start",
      controller : require('./start/start.js'),
      templateProvider: function($templateCache) {
        return $templateCache.get("start/start.html");
      }
    }
  )
})
.factory("ImapService", require("./imapService.js"))
.controller("StartCtrl", require("./start/start.js"))
.controller("AppCtrl", function($scope, $state) {
})
.run([ "$rootScope", "$state", "$stateParams", 
  function ($rootScope, $state, $stateParams) {
    
  }
])


