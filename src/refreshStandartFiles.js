const path = require("path"),
  fs = require("fs"),
  ncp = require("ncp").ncp;

const Utils = require("./utils")({});

console.clear();

async function copy(fileDest, filePath) {
  if (Utils.File.pathExist(fileDest)) {
    let confirReplace = await Utils.Question.confirm({
      message: `${fileDest} already exist, replace it?`,
    });

    if (confirReplace) {
      fs.rmdirSync(fileDest, { recursive: true });
    } else return null;
  }

  return await ncp(filePath, fileDest, function (err) {
    if (err) return console.error(err);
  });
}
// require('./../src/standartFiles/.ant')

async function runSetup() {
  await copy("./src/standartFiles/.ant", "./.ant");
  await copy("./src/standartFiles/build.xml", "./build.xml");
  await copy("./src/standartFiles/gulpfile.js", "./gulpfile.js");
  await copy("./src/standartFiles/project.config.js", "./project.config.js");
}

runSetup();
