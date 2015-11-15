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
require("angular-moment");
require("checklist-model");
window.rangy = require("rangy/lib/rangy-core");
window.randomcolor = require("randomcolor");
window.rangy.saveSelection = require("rangy/lib/rangy-selectionsaverestore");
require("textangular/dist/textAngular-sanitize.min");
require("textangular");
require("angular-translate");
window.objectHash = require("object-hash");
window.lodash = require("lodash");
window.async = require("async");
var conf = require("../../conf/prod/surelia.js");
var id = require("./localization/id.js");
var en = require("./localization/en.js");

// Load service and controllers
require("./service/index");
require("./filters/index");
require("./controllers/index");
require("./js/templates");

var app = angular.module("App", [
  "ui.router", 
  "ui.bootstrap",
  "ngAnimate",
  "ngSanitize",
  "textAngular",
  "templates",
  "LocalStorageModule",
  "app.services",
  "app.filters",
  "app.controllers",
  "ngProgress",
  "toastr",
  "ngFileUpload",
  "angularMoment",
  "pascalprecht.translate",
  "checklist-model"
])
.constant("conf", conf)
.config(function ($translateProvider) {
  $translateProvider.translations('en', en);
  $translateProvider.translations('id', id);
  $translateProvider.preferredLanguage(conf.lang);
  $translateProvider.useSanitizeValueStrategy('sanitize');
})
.config(function($httpProvider){
  $httpProvider.defaults.timeout = 60000;
})
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
.config(function($provide){
  $provide.decorator('taOptions', ['taRegisterTool', '$delegate', function(taRegisterTool, taOptions){
    // $delegate is the taOptions we are decorating
    // register the tool with textAngular
    taOptions.toolbar = [
      [
        /* "h1", */
        /* "h2", */
        /* "h3", */
        /* "h4", */
        /* "h5", */
        /* "h6", */
        /* "pre", */
        "quote",
        "bold",
        "italics",
        "underline",
        "strikeThrough",
        "ul",
        "ol",
        "justifyLeft",
        "justifyCenter",
        "justifyRight",
        "justifyFull",
        "html",
        "insertImage",
        "insertLink",
        "insertVideo"
      ]
    ]
    return taOptions; 
    }]);
})
// Register controller
.controller("AppCtrl", function($scope, $state) {
  $state.go("Login");
})
.run([ "$rootScope", "$state", "$stateParams", 
  function ($rootScope, $state, $stateParams) {
    
  }
])



