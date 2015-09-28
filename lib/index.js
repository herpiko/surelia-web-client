var idup = require("idup");
var pkg = require("../package");
var server = require("./server");

module.exports = function(options) {
  options = options || {};

  if (options.single)
    return server.start(function(err){
      if (err) {
        console.log(err);
      } else {
        console.log("server is running at", server.info.port);
      }
    });

  idup.connect(function(){
    if (options.restart) {
      idup.restartProcessByName(pkg.name);
    } else {
      idup.startFile(__dirname + "/idup.js",
          {
            name: pkg.name,
            script: __dirname + "/idup.js",
            exec_mode: 'cluster',
            instances: 1, // options
          }, function(err){
            console.log(err || "Running as daemon")
              process.exit();
          });
    }
  });
}
