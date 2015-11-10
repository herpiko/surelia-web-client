'use strict';

var angular = require('angular');
var bulk = require('bulk-require');

module.exports = angular.module("app.filters", []);

bulk(__dirname, ['./!(*index|*.spec).js']);
