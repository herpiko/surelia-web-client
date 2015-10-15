'use strict';

// Load service
require("./service/index");

var app = angular.module("App", [
  "ui.router", 
  "ui.bootstrap",
  "ngAnimate",
  "html",
  "LocalStorageModule",
  "app.services"
])
.config(function($stateProvider) {
  $stateProvider
  .state("start", {
      url: "/start",
      templateProvider: function($templateCache) {
        return $templateCache.get("start/start.html");
      }
    }
  )
  .state("main", {
      url: "/main",
      templateProvider: function($templateCache) {
        return $templateCache.get("main/main.html");
      }
    }
  )
})
// Register controller
.controller("StartCtrl", require("./start/start"))
.controller("MainCtrl", require("./main/main"))
.controller("AppCtrl", function($scope, $state) {
  $state.go("start");
})
.run([ "$rootScope", "$state", "$stateParams", 
  function ($rootScope, $state, $stateParams) {
    
  }
])



