var gulp    = require("gulp");
var uglify = require("gulp-uglify");
var concat  = require("gulp-concat");
var clean   = require("gulp-rimraf");
var files   = require("./files.json");
var runSequence = require('run-sequence');
var ngHtml2Js = require("gulp-ng-html2js");
var minifyHtml = require("gulp-minify-html");

var lr;
var bootMode = "normal";

for (i = 0; i < process.argv.length; i ++) {
  if (process.argv[i] == "--bootmode=test") {
    bootMode = "test";
  }
}

gulp.task("clean", function() {
  return gulp.src(["www/*"], {read:false}).pipe(clean());
});

gulp.task("maps", function() {
  gulp.src(files.maps)
  .pipe(gulp.dest("./public"))
});

gulp.task("libs", ["maps"], function() {
  gulp.src(files.libs)
  .pipe(concat("libs.js"))
  .pipe(gulp.dest("./public/"))
});

gulp.task("fa", function() {
  gulp.src(files.fa)
  .pipe(gulp.dest("./public/fontawesome/"))
});

gulp.task("styles", ["fa"], function() {
  gulp.src(files.styles)
  .pipe(concat("app.css"))
  .pipe(gulp.dest("./public/"))
});

gulp.task("images", function() {
  gulp.src(files.images)
  .pipe(gulp.dest("./public/images"))
});

gulp.task("fonts", function() {
  gulp.src(files.fonts)
  .pipe(gulp.dest("./public/fonts"))
});

gulp.task("html", function() {
  gulp.src("src/index.html")
  .pipe(gulp.dest("./public"));

  gulp.src(files.html)
  .pipe(minifyHtml({
    empty: true,
    spare: true,
    quotes: true
  }))
  .pipe(ngHtml2Js({
    moduleName: "html"
  }))
  .pipe(concat("html.min.js"))
  .pipe(uglify())
  .pipe(gulp.dest("./public"))
});

gulp.task("src", ["html", "images"], function() {

  if (bootMode == "normal") {
    files.src.push("boot/prod/boot.js");
  } else {
    files.src.push("boot/dev/boot.js");
  }

  gulp.src(files.src)
  .pipe(concat("src.js"))
  .pipe(gulp.dest("./public"))
});

gulp.task("watch", function(){
  startServer();
  startLiveReload();
  gulp.watch(["src/**", "src/**/**"], notifyLivereload);
});

var tasks = ["clean", "styles", "libs", "src", "fonts"];

gulp.task("default", tasks);
