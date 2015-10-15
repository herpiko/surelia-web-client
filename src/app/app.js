'use strict';
require("./service/index");

angular.element(document).ready(function(){
  window.app = angular.module("App", [
    "ui.router", 
    "ui.bootstrap",
    "ngAnimate",
    "html",
    "LocalStorageModule",
    /* "app.service" */
  ])
  .config(function($stateProvider) {
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
  .controller("StartCtrl", require("./start/start"))
  .controller("AppCtrl", function($scope, $state) {
  })
  .run([ "$rootScope", "$state", "$stateParams", 
    function ($rootScope, $state, $stateParams) {
      
    }
  ])
})



