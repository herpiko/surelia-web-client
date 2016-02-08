
var Public = function(server, options, next) {
  this.server = server;
  this.options = options || {};
  this.registerEndPoints();
}

Public.prototype.registerEndPoints = function() {
  var self = this;
  self.server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: 'public'
      }
    },
    config : {
      state : {
        parse : true,
        failAction : 'ignore'
      }
    }
  });
}

exports.register = function(server, options, next) {
  new Public(server, options, next);
  next();
};

exports.register.attributes = {
  pkg: require("./package.json")
};


