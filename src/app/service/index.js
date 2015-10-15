'use strict';

var bulk = require('bulk-require');

module.exports = angular.module("app.services", []);

bulk(__dirname, ['./!(*index|*.spec).js']);
