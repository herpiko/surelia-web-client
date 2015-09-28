'use strict';
angular.module("App", [
  "ui.router", 
  "ui.bootstrap",
  "ngAnimate",
  "test",
  "html",
  "angularFileUpload",
  "start"
])
.config(function($stateProvider) {
  $stateProvider
  .state("start", {
      url: "/start",
      controller: "StartCtrl",
      templateProvider: function($templateCache) {
        return $templateCache.get("start/start.html");
      }
    }
  )
})
.controller("AppCtrl", function($scope) {
})
.run([ "$rootScope", "$state", "$stateParams", 
  function ($rootScope, $state, $stateParams) {
  }
])


