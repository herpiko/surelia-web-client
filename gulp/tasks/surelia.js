'use strict';

var config       = require('../config');
var gulp         = require('gulp');
var replace      = require("gulp-replace");
var gulpif       = require('gulp-if');
var browserSync  = require('browser-sync');

gulp.task('surelia', function () {
  var gearman = process.env.GEARMAN || false;
  if (gearman) {
    gearman = "\"" + gearman + "\"";
  }
  gulp.src(config.surelia.src)
    .pipe(replace(false, gearman))
    .pipe(gulp.dest(config.surelia.dest))
    .pipe(gulpif(browserSync.active, browserSync.reload({ stream: true, once: true })));
});
