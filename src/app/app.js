'use strict';

var angular = require('angular');

require("angular-ui-router");
require("angular-animate");
require("angular-bootstrap");
require("angular-local-storage");
require("angular-file-upload");
require("ngprogress-npm");
require("angular-toastr");
require("ng-file-upload");

// Load service and controllers
require("./service/index");
require("./controllers/index");
require("./js/templates");

var app = angular.module("App", [
  "ui.router", 
  "ui.bootstrap",
  "ngAnimate",
  "templates",
  "LocalStorageModule",
  "app.services",
  "app.controllers",
  "ngProgress",
  "toastr",
  "ngFileUpload"
])
.config(function($stateProvider) {
  $stateProvider
  .state("Login", {
      url: "/login",
      templateProvider: function($templateCache) {
        return $templateCache.get("login.html");
      }
    }
  )
  .state("Message", {
      url: "/message",
      templateProvider: function($templateCache) {
        return $templateCache.get("message.html");
      }
    }
  )
})
// Register controller
.controller("AppCtrl", function($scope, $state) {
  $state.go("Login");
})
.run([ "$rootScope", "$state", "$stateParams", 
  function ($rootScope, $state, $stateParams) {
    
  }
])



