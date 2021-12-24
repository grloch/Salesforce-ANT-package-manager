const gulp = require("gulp"),
  fs = require("fs"),
  path = require("path"),
  mkdir = require("mkdirp");

const projectConfig = require("./project.config");

const Utils = require("./src/utils")(projectConfig);

const cancelOpt = { name: "Cancel", value: null };


async function defaultTask(){
  var action = null;

  console.clear();

  const choices = [
    { name: "Create new environment", value: "project:new-enviroment" },
    {
      name: "Reload project environments",
      value: "project:reload-enviroment",
    },
    { name: "Create new package", value: "package:new" },
    { name: "Retrieve package", value: "package:retrieve" },
    { name: "Deploy package", value: "package:deploy" },
    { name: "Compact package", value: "package:compact" },
    { name: "Unzip package", value: "package:unzip" },
    { name: "Backup package", value: "package:backup" },
  ];

  action = await Utils.Question.list({
    message: "Select a task:",
    choices,
  });

  if (action) await gulp.series(action,"default")()
}

gulp.task("project:new-enviroment", async () => {
  console.clear();
  mkdir.manualSync(".env");

  const newEnv = await new Utils.Environment();

  await newEnv.setName();
  await newEnv.setActions();
  await newEnv.setUrl();
  await newEnv.setUser();
  await newEnv.setPwd();
  await newEnv.setToken();
  await newEnv.setActive();

  newEnv.print();

  const saveEnvironment = await Utils.Question.confirm({
    message: "Save environment?",
  });

  if (saveEnvironment) newEnv.save(), Utils.Project.realoadEnvironments();

  return;
});

gulp.task("project:reload-enviroment", async () => {
  console.clear();
  return Utils.Project.realoadEnvironments();
});

gulp.task("package:new", async () => {
  console.clear();
  mkdir.manualSync(projectConfig.unpackaged.path);

  const package = await new Utils.Package();

  await package.setPrefix();
  await package.setName();
  await package.setSufix();
  package.print();

  const savePackage = await Utils.Question.confirm({
    message: "Save package?",
  });

  if (savePackage) package.save();

  return;
});

gulp.task("package:retrieve", async () => {
  console.clear();

  const env = await Utils.Environment.select(
    "retrieve",
    "Select a environment to retrieve?"
  );

  if (!env) return null;

  var unpackaged = await Utils.File.selectFile(
    projectConfig.unpackaged.path,
    "Select a package to retrieve"
  );

  if (!unpackaged) return null;

  unpackaged = unpackaged.replace(/.xml$/, "");

  const ant = new Utils.Ant({
    type: "retrieve",
    packageFile: unpackaged,
    ...env,
  });

  await ant.checkPwd();
  await ant.checkToken();

  ant.build();

  console.log("Running ANT comand as:");
  ant.print();

  const confirm = await Utils.Question.confirm({
    message: "Run ANT command?",
  });

  if (confirm) await ant.run();
});

gulp.task("package:deploy", async () => {
  console.clear();

  const isTest = await Utils.Question.confirm({
    message: "Is this a deploy test?",
  });

  const env = await Utils.Environment.select(
    isTest ? "deployTest" : "deploy",
    "Select a environment to deploy?"
  );

  if (!env) return null;

  const package = await Utils.Question.list({
    message: "Select a package:",
    choices: [
      ...fs.readdirSync(projectConfig.package.path),
      { name: "Cancel", value: null },
    ],
  });

  const ant = new Utils.Ant({
    type: "deploy",
    isTest,
    packageFile: package,
    ...env,
  });

  await ant.seTestLevel();
  await ant.setSpecifiedTests();

  await ant.checkPwd();
  await ant.checkToken();

  ant.build();

  console.log("Running ANT comand as:");
  ant.print();

  const confirm = await Utils.Question.confirm({
    message: "Run ANT command?",
  });

  if (confirm) await ant.run();

  return null;
});

gulp.task("package:compact", async () => {
  console.clear();

  const package = await Utils.Question.list({
    message: "Select a package to compact:",
    choices: [
      ...fs.readdirSync(projectConfig.package.path),
      { name: "Cancel", value: null },
    ],
  });

  if (!package) return null;

  mkdir.manualSync(`closedPkg/${package}`);

  var fileName = package;

  const source = path.join(projectConfig.package.path, package);

  var out = path.resolve(__dirname, "closedPkg", package);

  const version = Utils.File.listFilesOn(out).length + 1;

  fileName += `_v${version}.zip`;

  out = path.join(out, fileName);

  await Utils.File.zipPath(source, out);
});

gulp.task("package:unzip", async () => {
  console.clear();
  const extract = require("extract-zip");

  console.log(
    "\n\n  WARNING: Unzip a package will remove and replace this package if it already exist \n\n"
  );

  const closedpackages = fs.readdirSync(projectConfig.package.closed);

  const package = await Utils.Question.list({
    message: "Select a package to compact:",
    choices: [...closedpackages, cancelOpt],
  });

  if (!package) return null;

  const packageVersions = fs.readdirSync(
    path.join(projectConfig.package.closed, package)
  );

  const version = await Utils.Question.list({
    message: `Select a of package ${package}:`,
    choices: [...packageVersions, cancelOpt],
  });

  const filePath = path.join(projectConfig.package.closed, package, version);
  const outpath = path.join(projectConfig.package.path, package);

  if (Utils.File.pathExist(outpath)) fs.rmdirSync(outpath, { recursive: true });

  try {
    fs.mkdirSync(projectConfig.package.path);
  } catch (e) {}

  try {
    fs.mkdirSync(projectConfig.unpackaged.path);
  } catch (e) {}

  try {
    fs.mkdirSync(outpath);
  } catch (e) {}

  await extract(filePath, { dir: outpath });

  fs.copyFile(
    path.join(outpath, "package.xml"),
    path.join(projectConfig.unpackaged.path, `${package}.xml`),
    () => {}
  );
});

gulp.task("package:backup", async () => {
  console.clear();

  const env = await Utils.Environment.select(
    "retrieve",
    "Select a environment to retrieve it:"
  );

  if (!env) return null;

  var unpackaged = await Utils.File.selectFile(
    projectConfig.unpackaged.path,
    "Select a package to retrieve and create a backup"
  );

  if (!unpackaged) return null;

  unpackaged = unpackaged.replace(/.xml$/, "");

  const ant = new Utils.Ant({
    type: "backup",
    packageFile: unpackaged,
    ...env,
  });

  await ant.checkPwd();
  await ant.checkToken();

  ant.build();

  console.log("Running ANT comand as:");
  ant.print();

  const confirm = await Utils.Question.confirm({
    message: "Run ANT command?",
  });

  if (confirm) await ant.run();

  const fileName = `${Utils.Time.timeStamp()}_${unpackaged}.zip`;

  const source = path.join(projectConfig.backup.path, unpackaged, "temp");
  var out = path.join(projectConfig.backup.path, unpackaged, fileName);

  await Utils.File.zipPath(source, out);

  if (Utils.File.pathExist(source)) fs.rmdirSync(source, { recursive: true });

  return;
});

gulp.task("default", defaultTask);
