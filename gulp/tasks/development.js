'use strict';

var gulp        = require('gulp');
var runSequence = require('run-sequence');

gulp.task('dev', ['clean'], function(cb) {

  cb = cb || function() {};

  global.isProd = false;

  runSequence(['db','styles', 'images', 'browserExtensions', 'fonts', 'views', 'browserify'], 'watch', cb);

});
