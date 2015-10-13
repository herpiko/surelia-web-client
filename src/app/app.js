'use strict';
angular.module("App", [
  "ui.router", 
  "ui.bootstrap",
  "ngAnimate",
  "test",
  "html",
  "angularFileUpload",
  "start",
  "imapService",
  "LocalStorageModule"
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
})
.controller("AppCtrl", function($scope, $state) {
    $state.go("start");
})
.run([ "$rootScope", "$state", "$stateParams", 
  function ($rootScope, $state, $stateParams) {
    
  }
])


