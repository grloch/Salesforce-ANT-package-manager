# IMPORTANT
This project still works, but it migrated to [grloch/Salesforce-Deploy-Utils](https://github.com/grloch/Salesforce-Deploy-Utils), in the future, I may add the Apache Ant functionalities (in resume this repository) to Salesforce-Deploy-Utils.

# Salesforce ANT Package Manager

What is your opinion about never think about creating an ANT environment again?

Whether to retrieve, test your packages or deploy them.

**REALLY!**

I present to you **SAPM** (Salesforce ANT Package Manager).

SAPM is an ANT package manager in Node.js + Gulp.

With it, you can create several customized packages, various environments and use any combination of both to retrieve, deploy or deploy test.

In addition, you can choose whether or not to save your logs after each operation involving ANT.

## Table of contens

1. [Installing](#Installing)
1. [Creating a environment](#creating-a-environment)

## Installing

1. Download this repository
2. Make sure you have [Node.js](https://nodejs.org/en/) installed: `node --version`
3. Run `npm i`
4. Make sure you have [ANT](https://ant.apache.org/) installed: `ant -version`
5. Don't forget to add Salesforce lib on your ANT lib.
6. run `npm run setup`, it will create `project.config.js` at root, you can customize it at your will. Don't forget to change the ` prefix` and `sufix` entrys.

## Menu
Use `npx gulp` to display all tasks as a menu.

## Creating

### Environment

```
npx gulp project:new-enviroment
```

Setup your new enviroment, set:

- A name
- Select the actions allowed for the environment (retrieve, test, deploy)
- Environment url
- Environment user
- Environment password (you can choose not inform it)
- Environment token (you can choose not inform it)
- Environment is active

Or if you want, you can manually create a environment, create a .json file at .env/:

```
./.env/my-env.json
```

```java
{
	name: "My Env",
	allowedActions: {
		retrieve: true,
		deploy: true,
		deployTest: true
	},
	url: "https://test.salesforce.com",
	user: "my_env@user.com",
	pwd: "myEnvPW",
	secretToken: "mySalesForceToken",
	active: true
}
```

Whenever you create an environment manually, don't forget to run `npx gulp project:reload-enviroment` to reload the list of environments.

### Package

```
npx gulp package:new
```

It will generate a copy of you template package at `./unpackaged/package-name.xml`

You will be able to choose a prefix, a name and a sufix for the package name.

The _prefix_ and _name_ ar both a string input, but _sufix_ is retrieved from `project.config.js.package.sufix`.

If you want, you can customize the prefix default value and the sufix options on `project.config.js.package.sufix`:

```javascript
//...
package: {
    prefix: "MyCustomPrefix",
    sufix: [
		{ name: "Sufix label", value: "SL" },
    ],
},
```

<!--
```npx gulp package:compact```

```npx gulp package:retrieve```

```npx gulp package:deploy```

```npx gulp package:backup``` -->
