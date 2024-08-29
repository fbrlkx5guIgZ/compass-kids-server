module.exports = {
  apps : [{
    name   : "app1",
    script : "vapp/server.js",
    watch: true,
    ignore_watch: ["node_modules"],
    error_file: "log/error.log",
    out_file: "log/out_file.log",
  }]
}
