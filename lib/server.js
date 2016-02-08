var Hapi = require('hapi');
var sources = require("../api/");

var server = new Hapi.Server();
var port = process.env.PORT || 3000;
server.connection({ port: parseInt(port), labels: ['api'] });
sources.populate(server);

server.register({
    register: require('hapi-swagger'),
    options: {
        apiVersion: "1.0"
    }
}, function (err) {
    if (err) {
        server.log(['error'], 'hapi-swagger load error: ' + err)
    }else{
        server.log(['start'], 'hapi-swagger interface loaded')
    }
});

module.exports = server;
