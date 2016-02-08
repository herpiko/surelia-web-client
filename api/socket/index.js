'use strict';

var Socket = function(server, options, next) {
  this.server = server;
  this.options = options || {};
  this.io = server.plugins['hapi-io'].io;
    this.io.on("connection", function(socket){
      console.log("a client connected");
      // Handle emit from clients
      socket.on("join", function(id){
        console.log("a client join " + id + " room");
        socket.join(id);
      })
      socket.on("leave", function(id){
        console.log("a client leave " + id + " room");
        socket.leave(id);
      })
  })
}

exports.register = function(server, options, next) {
  new Socket(server, options, next);
  next();
};

exports.register.attributes = {
  pkg: require("./package.json")
};


