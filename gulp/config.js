'use strict';

module.exports = {

  'db': {
    'src' : ['conf/hapi-mongoose-db-connector.settings.json'],
    'dest': 'api/'
  },
  'surelia': {
    'src' : ['conf/surelia.settings.json'],
    'dest': 'api/'
  },
  'styles': {
    'src' : ['src/app/styles/*.css', 'src/app/styles/**/*.scss'],
    'dest': 'public/css'
  },

  'scripts': {
    'src' : 'src/app/**/*.js',
    'dest': 'public/js'
  },

  'images': {
    'src' : 'src/app/images/**/*',
    'dest': 'public/images'
  },

  'fonts': {
    'src' : ['src/app/fonts/**/*'],
    'dest': 'public/fonts'
  },

   'views': {
    'watch': [
      'src/app/index.html',
      'src/app/views/**/*.html'
    ],
    'src': 'src/app/views/**/*.html',
    'dest': 'src/app/js'
  },

  'gzip': {
    'src': 'public/**/*.{html,xml,json,css,js,js.map}',
    'dest': 'public/',
    'options': {}
  },

  'dist': {
    'root'  : 'public'
  },

  'browserify': {
    'entries'   : ['src/app/app.js'],
    'bundleName': 'app.js',
    'sourcemap' : true
  },

  'test': {
    'karma': 'test/karma.conf.js',
    'protractor': 'test/protractor.conf.js'
  }

};
