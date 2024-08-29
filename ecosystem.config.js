const process = require("process");

module.exports = {
  apps : [{
    name   : "app1",
    script : "vapp/server.js",
    cwd: __dirname,
    watch: true,
    ignore_watch: ["node_modules"],
    error_file: "log/error.log",
    out_file: "log/out_file.log",
  }]
}
