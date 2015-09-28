var single = false;
var restart = false;
for (var i in process.argv) {
  if (process.argv[i] == "single") {
    single = true;
  }
  else if (process.argv[i] == "restart") {
    restart = true;
  }
}
require(__dirname + "/lib")({ single: single, restart: restart });
