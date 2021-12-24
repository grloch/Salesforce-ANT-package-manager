const inquirer = require("inquirer"),
  fs = require("fs"),
  archiver = require("archiver"),
  path = require("path"),
  childProcess = require("child_process"),
  extract = require("extract-zip"),
  xml2js = require("xml2js");

module.exports = (projectConfig = null) => {
  if (!projectConfig) projectConfig = require("../project.config");

  class File {
    static pathExist(path, verbose = false) {
      try {
        fs.accessSync(path, (err) => { });
        return true;
      } catch (error) {
        if (verbose) console.log(error.message);
        return false;
      }
    }

    static listFilesOn(dirPath, verbose = false) {
      try {
        const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

        return dirents
          .filter((dirent) => dirent.isFile())
          .map((dirent) => dirent.name);
      } catch (error) {
        if (verbose) console.log(`The path '${dirPath}' doesn't exist.`);
        return null;
      }
    }

    static async selectFile(dirPath = null, message, verbose = false) {
      if (!dirPath)
        throw new Error("Must infor a path for Utils.File.selectFile()");

      var choices = this.listFilesOn(dirPath, verbose);

      if (choices.length == 0) throw new Error("No files on the informed path");

      // choices = choices.map((i) => {
      //   return { name: i.replace(/.xml$/, ""), value: i };
      // });

      return Question.list({
        message,
        choices: [...choices, { name: "Cancel", value: null }],
      });
    }

    static async zipPath(source, out) {
      const archive = archiver("zip", { zlib: { level: 9 } });
      const stream = fs.createWriteStream(out);

      return new Promise((resolve, reject) => {
        archive
          .directory(source, false)
          .on("error", (err) => reject(err))
          .pipe(stream);

        stream.on("close", () => resolve());
        archive.finalize();
      });
    }

    static async unzipPath(source, out) {
      try {
        await extract(source, { dir: out });
        console.log("Extraction complete");
      } catch (err) {
        console.log(err);
        // handle any errors
      }
    }
  }

  class String {
    static mask(strg, replacer) {
      let aux = "";

      for (let i = 0; i < strg.length; i++) aux += replacer;

      return aux;
    }
  }

  class Question {
    static defaultValidateCB = () => {
      return true;
    };

    static async checkbox(
      args = {
        message: null,
        choices: [],
        validate,
      }
    ) {
      const { message, choices } = args;

      const validate = args.validate || this.defaultValidateCB;

      return inquirer
        .prompt([
          {
            type: "checkbox",
            name: "response",
            message,
            choices,
            validate,
          },
        ])
        .then((answers) => {
          return answers.response;
        })
        .catch((error) => {
          console.log(error);
          return null;
        });
    }

    static async input(
      args = {
        message: null,
        error: null,
        default: null,
        validate: null,
        allowEmptyAnswer: false,
      }
    ) {
      const { message, error } = args;
      const allowEmptyAnswer = args.allowEmptyAnswer || false;
      const validate = args.validate || this.defaultValidateCB;

      return inquirer
        .prompt({
          type: "input",
          message,
          name: "text",
          default: args.default,
          validate: (input) => {
            if (!allowEmptyAnswer && input == "") {
              if (error) console.log("      You must enter a input!");

              return false;
            }

            if (!validate(input)) {
              console.log(`      ${error}`);
              return false;
            }
            return true;
          },
        })
        .then((answers) => {
          return answers.text.toString();
        })
        .catch((error) => {
          console.log("inquirer input error: ");
          console.log(error);
          return null;
        });
    }

    static async pwd(
      args = {
        message: null,
        error: null,
        default: null,
        validate: null,
        allowEmptyAnswer: false,
      }
    ) {
      const { message, error } = args;
      const validate = args.validate || this.defaultValidateCB;
      const allowEmptyAnswer = args.allowEmptyAnswer || false;

      return inquirer
        .prompt({
          type: "password",
          message,
          name: "text",
          default: args.default,
          validate: (input) => {
            if (!allowEmptyAnswer && input == "") {
              if (error) {
                var output = error == true ? "You must enter a input!" : error;
                console.log(`      ${output}`);
              }

              return false;
            }

            if (!validate(input)) {
              console.log(`      ${error}`);
              return false;
            }
            return true;
          },
        })
        .then((answers) => {
          return answers.text.toString();
        })
        .catch((error) => {
          console.log("inquirer input error: ");
          console.log(error);
          return null;
        });
    }

    static async confirm(args = { message: null }) {
      const { message } = args;

      return inquirer
        .prompt([
          {
            type: "list",
            name: "response",
            message,
            choices: ["Yes", "No"],
          },
        ])
        .then((answers) => {
          return answers.response.toString() == "Yes";
        })
        .catch((error) => {
          console.log(error);
          return null;
        });
    }

    static async list(
      args = {
        message: null,
        choices: [],
        validate: null,
      }
    ) {
      const { message, choices } = args;
      const validate = args.validate || this.defaultValidateCB;
      return inquirer
        .prompt([
          {
            type: "list",
            name: "response",
            message,
            choices,
            validate,
          },
        ])
        .then((resp) => {
          return resp.response;
        })
        .catch((error) => {
          console.log(error);
          return null;
        });
    }
  }

  class Project {
    static realoadEnvironments() {
      console.log("Rebuilding environments.");

      const envs = File.listFilesOn(path.resolve(__dirname, "..", ".env"));

      if (!envs)
        throw new Error(
          "There's no .env folder, create a enviroment and try again."
        );

      fs.rmdirSync(".envs.json", { recursive: true });

      const envsList = { all: [], retrieve: [], deploy: [], deployTest: [] };

      for (let i = 0; i < envs.length; i++) {
        const envFileName = envs[i];

        let loadedEnv = require(path.resolve(
          __dirname,
          "..",
          ".env",
          envFileName
        ));

        // console.log(loadedEnv);
        const { allowedActions: action } = loadedEnv;

        // console.log(action);
        const { name, active } = loadedEnv;
        const entry = { name, value: envFileName };

        if (!active) continue;

        envsList.all.push(entry);
        if (action.retrieve) envsList.retrieve.push(entry);
        if (action.deploy) envsList.deploy.push(entry);
        if (action.deployTest) envsList.deployTest.push(entry);
      }

      return fs.writeFileSync(
        `.envs.json`,
        JSON.stringify(envsList, null, "\t")
      );

      return null;
    }
  }

  class Environment {
    constructor(
      args = {
        name: null,
        allowedActions: null,
        url: null,
        user: null,
        pwd: null,
        secretToken: null,
        active: false,
      }
    ) {
      const {
        name,
        allowedActions,
        url,
        user,
        pwd,
        secretToken,
        active,
      } = args;

      this.name = name;
      this.allowedActions = allowedActions || {
        retrieve: false,
        deploy: false,
        deployTest: false,
      };
      this.url = url;
      this.user = user;
      this.pwd = pwd || "";

      this.secretToken = secretToken;
      this.active = active;
    }

    async setName() {
      this.name = await Question.input({
        message: "Set the environment name:",
        error: "Invalid enviroment name",
        validate: (input) => {
          return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(input);
        },
      });

      return this.name;
    }

    async setActions() {
      const envActions = await Question.checkbox({
        message: "This environment can... :",
        choices: [
          { name: "Retrieve", value: "retrieve" },
          { name: "Deploy", value: "deploy" },
          { name: "Deploy Test", value: "deployTest" },
        ],
      });

      envActions.forEach(async (act) => (this.allowedActions[act] = true));

      return this.allowedActions;
    }

    async setUrl() {
      this.url = await Question.input({
        message: "Set the environment URL:",
        error: "Must set a URL",
        default: projectConfig.defaultUrl,
      });

      return this.url;
    }

    async setUser() {
      this.user = await Question.input({
        message: "Set the environment user:",
        error: "Must set a user",
      });

      return this.user;
    }

    async setPwd() {
      this.pwd = await Question.pwd({
        message:
          "Set the environment password: (you are not required to save a password)",
        allowEmptyAnswer: true,
      });

      return this.pwd;
    }

    async setToken() {
      this.secretToken = await Question.pwd({
        message: "Set the environment Token:",
      });

      return this.secretToken;
    }

    async setActive() {
      this.active = await Question.confirm({
        message: "Enviroment is active?",
      });

      return this.active;
    }

    getEnvJson() {
      return {
        name: this.name,
        allowedActions: this.allowedActions,
        url: this.url,
        user: this.user,
        pwd: this.pwd,
        secretToken: this.secretToken,
        active: this.active,
      };
    }

    print() {
      const actionsPretty = () => {
        let resp = `Retrieve (${this.allowedActions.retrieve ? "Yes" : "No"
          }),   `;
        resp += `Deploy (${this.allowedActions.deploy ? "Yes" : "No"}),   `;
        resp += `Deploy test(${this.allowedActions.deployTest ? "Yes" : "No"})`;

        return resp;
      };

      console.log("\n");
      console.log(" - Name            : ", this.name);
      console.log(" - Allowed actions : ", actionsPretty());
      console.log(" - URL             : ", this.url);
      console.log(" - User            : ", this.user);
      console.log(" - Password        : ", String.mask(this.pwd, "*"));
      console.log(" - Secret token    : ", String.mask(this.secretToken, "*"));
      console.log(" - Active          : ", this.active ? "Yes" : "No");
      console.log("\n");
    }

    save() {
      const fileName = `${this.name.toLowerCase().split(" ").join("-")}.json`;

      const env = JSON.stringify(this.getEnvJson(), null, "\t");

      const fpath = `./.env/${fileName}`;
      return fs.writeFileSync(fpath, env);
    }

    static async select(envKeyType, message) {
      const envList = require("../.envs.json")[envKeyType];

      if (!envList || envList.length == 0)
        throw new Error(
          "Error when trying to get env list, be sure that you created a environment."
        );

      const envFileName = await Question.list({
        message,
        choices: [
          ...envList,
          {
            name: "Cancel",
            value: null,
          },
        ],
      });

      return envFileName ? require(`../.env/${envFileName}`) : null;
    }
  }

  class Package {
    constructor(args = { name: null, prefix: null, sufix: null }) {
      const { name, prefix, sufix } = args;

      this.name = name;
      this.prefix = prefix;
      this.sufix = sufix;
      this.filename = "";

      this.setFilename();
    }

    async setName() {
      this.name = await Question.input({
        message: "What is the name of the package?",
        error: "Enter a name or a valid name!",
        validate: (input) => {
          return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(input);
        },
      });

      this.setFilename();

      return this.name;
    }

    async setPrefix() {
      this.prefix = await Question.input({
        message: "Set the package prefix:",
        error: "You must enter a prefix",
        allowEmptyAnswer: true,
        default: projectConfig.package.prefix,
      });

      this.setFilename();

      return this.prefix;
    }

    async setSufix() {
      this.sufix = await Question.list({
        message: "Add a sufix to package name?",
        allowEmptyAnswer: true,
        choices: [
          ...projectConfig.package.sufix,
          { name: "Don't add a Sufix", value: "" },
        ],
      });

      this.setFilename();

      return this.sufix;
    }

    setFilename() {
      var fileName = [];

      if (this.prefix && this.prefix != "") fileName.push(this.prefix);
      if (this.name && this.name != "") fileName.push(this.name);
      if (this.sufix && this.sufix != "") fileName.push(this.sufix);

      this.filename = fileName.join("-").split(" ").join("_");
      this.filename += ".xml";
    }

    print() {
      console.log("\n");
      console.log(" - Prefix          : ", this.prefix);
      console.log(" - Name            : ", this.name);
      console.log(" - Sufix           : ", this.sufix);
      console.log("\n - File name       : ", this.filename);
      console.log("\n");
    }

    save() {
      const filePath = path.join(projectConfig.unpackaged.path, this.filename);

      console.log(filePath);

      fs.copyFileSync(projectConfig.package.template, filePath);
    }
  }

  class Ant {
    constructor(
      args = {
        type: null,
        packageFile: null,
        isTest: null,
        user: null,
        pwd: null,
        secretToken: null,
        url: null,
        testLevel: null,
        testClass: "",
      }
    ) {
      const {
        type,
        packageFile,
        isTest,
        user,
        pwd,
        secretToken,
        url,
        testLevel,
        testClass,
      } = args;

      this.type = type;
      this.package = packageFile;

      this.user = user;
      this.pwd = pwd;
      this.secretToken = secretToken;

      this.url = url;

      this.isTest = isTest;
      this.testLevel = testLevel;
      this.testClass = testClass;

      this.logPath = null;

      this.cmd = null;

      this.setLogPath();
    }

    setLogPath() {
      const timeStamp = Time.timeStamp();
      var isTest = "";
      if (this.isTest == false || this.isTest == true) {
        isTest = this.isTest == true ? "_test" : "";
      }

      this.logPath = path.join(
        projectConfig.logPath,
        this.package,
        `${timeStamp}_${this.type}${isTest}.log`
      );
    }

    build() {
      if (!this.type) throw new Error("Must set a type for ANT command!");

      this.cmd = `ant ${this.type}`;
      if (this.package) this.cmd += ` -Dpackagename="${this.package}"`;
      if (this.user) this.cmd += ` -Duser="${this.user}"`;
      if (this.pwd && this.secretToken) {
        this.cmd += ` -Dpwd="${this.pwd}${this.secretToken}"`;
      } else this.cmd += ` -Dpwd="null"`;
      if (this.url) this.cmd += ` -Durl="${this.url}"`;
      if (this.isTest == true || this.isTest == false)
        this.cmd += ` -DcheckOnly="${this.isTest}"`;
      if (this.logPath) this.cmd += ` -DlogPath="${this.logPath}"`;
      if (this.testLevel) this.cmd += ` -Dtestlevel="${this.testLevel}"`;
      if (this.testClass) this.cmd += ` -DtestClass="${this.testClass}"`;
    }

    print() {
      console.log("\n");
      if (this.type) console.log(" - Type                 : ", this.type);
      if (this.package) console.log(" - Package file         : ", this.package);
      if (this.user) console.log(" - User                 : ", this.user);
      if (this.pwd)
        console.log(" - Password             : ", String.mask(this.pwd, "*"));
      if (this.secretToken)
        console.log(
          " - Secret token         : ",
          String.mask(this.secretToken, "*")
        );
      if (this.url) console.log(" - URL                  : ", this.url);
      if (this.isTest == true || this.isTest == false)
        console.log(" - Check only           : ", this.isTest ? "Yes" : "No");
      if (this.testLevel)
        console.log(" - Test level           : ", this.testLevel);
      try {
        if (this.testClass.length > 0)
          console.log(" - Run Specific Test    : ", this.testClass);
      } catch (error) { }
      if (this.logPath) console.log(" - Log Path             : ", this.logPath);
      console.log("\n");
    }

    async checkPwd() {
      if (!this.pwd || this.pwd == "") {
        this.pwd = await Question.pwd({
          message: "Inform the environment password",
          error: "Must inform a password!!",
        });
      }
    }

    async checkToken() {
      // this.pwd = pwd;
      // this.secretToken = secretToken;
      if (!this.secretToken || this.secretToken == "") {
        this.secretToken = await Question.pwd({
          message: "Inform the environment token",
          error: "Must inform a token!!",
        });
      }
    }

    async run() {
      console.log("Running ANT command...");
      console.log("                       ... this can take a while.");

      var cmdLog = childProcess.execSync(this.cmd).toString();

      console.log(cmdLog);

      const deleteLog = await Question.confirm({ message: "Keep this log?" });

      if (!deleteLog) this.deleteLog();

      this.clearSpecifiedTests();
    }

    async deleteLog() {
      fs.unlink(this.logPath, function (err) {
        if (err) throw err;
        console.log("File deleted!");
      });
    }

    async setTestLevel() {
      const choices = [
        { name: "No test (No tests are run)", value: "NoTestRun" },
        {
          name: "Run specified tests (Only the tests that you specify are run)",
          value: "RunSpecifiedTests",
        },
        {
          name:
            "Run local tests (All tests in your org are run, except the ones that originate from installed managed and unlocked packages)",
          value: "RunLocalTests",
        },
        {
          name:
            "Run all tests in org (All tests are run. The tests include all tests in your org, including tests of managed packages)",
          value: "RunAllTestsInOrg",
        },
      ];
      this.testLevel = await Question.list({
        message: "Select a log level:",
        choices,
      });
    }

    getPackageMember(memberName) {
      const parser = new xml2js.Parser();

      const packagePath = path.join(
        projectConfig.package.path,
        this.package,
        "package.xml"
      );

      var classes = [];

      parser.parseString(fs.readFileSync(packagePath), (err, result) => {
        result.Package.types.forEach((type) => {
          let { members, name } = type;

          if (name == memberName) classes.push(...members);
        });
      });

      return classes;
    }

    async setSpecifiedTests() {
      const antDeployFile = path.join(projectConfig.ant.path, "deploy.xml");
      var deployFile = fs
        .readFileSync(antDeployFile, "utf8")
        .replace(
          /<!-- Apex classes test - start -->([\s\S]*)<!-- Apex classes test - end -->/,
          `<!-- Apex classes test - start -->\n		<!-- Apex classes test - end -->`
        );

      fs.writeFileSync(antDeployFile, deployFile);

      if (this.testLevel != "RunSpecifiedTests") return;

      let classes = [];
      let addNewTestClass = false;

      do {
        classes.push(await Question.input({
          allowEmptyAnswer: false,
          message: 'Inform the class name to test: '
        }));

        addNewTestClass = await Question.confirm({ message: 'Add a new class?' })
      } while (addNewTestClass);

      this.testClass = classes.join(", ");

      if (classes.length == 0)
        throw new Error("Must select at least one class.");

      for (let i = 0; i < classes.length; i++)
        classes[i] = `<runTest>${classes[i]}</runTest>`;

      deployFile = deployFile.replace(
          /<!-- Apex classes test - start -->([\s\S]*)<!-- Apex classes test - end -->/,
          `<!-- Apex classes test - start -->\n${classes.join(
            ""
          )}\n		<!-- Apex classes test - end -->`
        );

      fs.writeFileSync(antDeployFile, deployFile);
    }

    clearSpecifiedTests() {
      const antDeployFile = path.join(projectConfig.ant.path, "deploy.xml");

      var deployFile = fs
        .readFileSync(antDeployFile, "utf8")
        .replace(
          /<!-- Apex classes test - start -->([\s\S]*)<!-- Apex classes test - end -->/,
          `<!-- Apex classes test - start -->\n		<!-- Apex classes test - end -->`
        );

      return fs.writeFileSync(antDeployFile, deployFile);
    }
  }

  class Time {
    static timeStamp() {
      function numberPretty(value) {
        return value < 10 ? `0${value}` : value;
      }

      const now = new Date();

      const year = now.getFullYear();
      const month = numberPretty(now.getMonth() + 1);
      const day = numberPretty(now.getDate());
      const hour = numberPretty(now.getHours());
      const minute = numberPretty(now.getMinutes());
      const second = numberPretty(now.getSeconds());

      return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
    }
  }

  return { File, Time, Question, Project, Environment, Package, Ant };
};
