const path = require("path");

module.exports = {
  package: {
    path: path.resolve(__dirname, "packages"),
    prefix: "",
    sufix: [
      /*{name, value}*/
    ],
    closed: path.resolve(__dirname, "closedPkg"),
    template: path.resolve(__dirname, "src", "template", "unpackaged.xml"),
  },
  backup: {
    path: path.resolve(__dirname, "backup"),
  },
  unpackaged: {
    path: path.resolve(__dirname, "unpackaged"),
  },
  logPath: path.resolve(__dirname, "logs"),
  ant: {
    path: path.resolve(__dirname, ".ant"),
  },
  defaultUrl: ""
};
