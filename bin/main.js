#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename */
const os = require("os")
const path = require("path")
const fs = require("fs")
const fsx = require("fs-extra")
const fsPromises = fs.promises
// eslint-disable-next-line security/detect-child-process
const child_process = require('child_process')
const yargs = require("yargs")
const ini = require('ini')
const logFactory = require("./log.js")
const gist = require("./gist.js")
const updateNotifier = require('update-notifier')

const pkg = require('../package.json')
updateNotifier({pkg, updateCheckInterval: 1000}).notify()

const homedir = os.homedir()
const originalVimrc = path.resolve(homedir, ".vimrc")
const originalBashrc = path.resolve(homedir, ".bashrc")
const originalBashProfile = path.resolve(homedir, ".bash_profile")
const selesa = path.resolve(homedir, ".selesa")
const cache = path.resolve(selesa, ".cache")
const log = path.resolve(selesa, ".log")
const configFile = path.resolve(homedir, ".selesarc")


const logger = logFactory.getLogger(log)
const time_s = "v" + new Date().toISOString()
	.replace(/\..+/, '')
	.replace(/:/g, '.')
const version = require("../package.json").version
let meta = {}
let fetchData_prm = null

const ensureFiles = () => {
	logger.info(`[selesa]: ensure cache folder and configuration files`)
	return fsx.ensureDir(cache)
		.then(() => fsx.ensureDir(log))
		.then(() => fsx.ensureFile(configFile))
		.then(() => fsx.ensureFile(originalBashProfile))
		.then(() => fsx.ensureFile(originalBashrc))
		.then(() => fsx.ensureFile(originalVimrc))
}
ensureFiles()

const ensureFetch = () => {
	if (!fetchData_prm) {
		fetchData_prm = gist.query(meta.token, meta.id)
	}
	return fetchData_prm
}

const writeConfiguration = (config) => {
	logger.info(`[selesa][write]: \r\n${JSON.stringify(config)}`)
	fs.writeFileSync(configFile, ini.stringify(config, {section: ''}))
}

const checkConfiguration = () => {
	const config = ini.parse(fs.readFileSync(configFile, 'utf-8'))
	if (!config.token) {
		logger.error(`[selesa][config]: token hasn't been set yet, use 'selesa config set --token xxxxx' to set it`)
		return "token hasn't been set yet"
	}
	if (!config.gistid) {
		logger.error(`[selesa][config]: gist id hasn't been set yet, use 'selesa config set --gistid xxxxx' to set it\r\n\t\tor 'selesa config set --gistid=-1' to create a new one`)
		return "gist id hasn't been set yet"
	}
	meta = {
		token: config.token,
		id: config.gistid,
	}
	return null
	// return new Promise((resolve, reject) => {
	// 	const rl = readline.createInterface({
	// 		input: process.stdin,
	// 		output: process.stdout
	// 	})
	// 	rl.question('set up your token for gits account:', (answer) => {
	// 		config.token = answer
	// 		fs.writeFileSync(configFile, ini.stringify(config, { section: '' }))
	// 		rl.close()
	// 		reject(answer)
	// 	})
	// })
}

const push = (parts) => {
	const result = checkConfiguration()
	if (result) {
		return Promise.reject(result)
	}
	logger.info(`[selesa]: begin to upload, ${parts}`)
	const options = {encoding: "utf8"}
	const reading = []
	const keys = []
	if (["vim", "all"].includes(parts)) {
		reading.push(fsPromises.readFile(originalVimrc, options))
		keys.push(".vimrc")
	}
	if (["bash", "all"].includes(parts)) {
		reading.push(fsPromises.readFile(originalBashrc, options))
		keys.push(".bashrc")
		reading.push(fsPromises.readFile(originalBashProfile, options))
		keys.push(".bash_profile")
	}
	return Promise.all(reading).then((arr) => {
		const files = {}
		keys.forEach((key, index) => {
			files[key] = {content: arr[index]}
		})
		files["..selesa"] = {
			content: JSON.stringify({"lastUpload": new Date().toISOString(), "version": version}),
		}
		return gist.update(meta.token, meta.id, files)
	})
}

const pullAll = () => {
	const result = checkConfiguration()	// use promise instead
	if (result) {
		return Promise.reject(result)
	}
	logger.info(`[selesa]: begin to download all configuration`)
	return pullVim().then(() => pullBash())
}

const pullVim = () => {
	const result = checkConfiguration()
	if (result) {
		return Promise.reject(result)
	}
	logger.info(`[selesa]: begin to download vim configuration`)
	return ensureFiles()
		.then(() => fsPromises.copyFile(originalVimrc, path.resolve(cache, `.vimrc.${time_s}`)))
		.then(() => ensureFetch())
		.then((content) => {
			return fsPromises.writeFile(originalBashProfile, content[".vimrc"])
		})
}

const pullBash = () => {
	const result = checkConfiguration()
	if (result) {
		return Promise.reject(result)
	}
	logger.info(`[selesa]: begin to download bash configuration`)
	return ensureFiles()
		.then(() => fsPromises.copyFile(originalBashProfile, path.resolve(cache, `.bash_profile.${time_s}`)))
		.then(() => fsPromises.copyFile(originalBashrc, path.resolve(cache, `.bashrc.${time_s}`)))
		.then(() => ensureFetch())
		.then((content) => {
			// eslint-disable-next-line promise/no-nesting
			return fsPromises.writeFile(originalBashProfile, content[".bash_profile"])
				.then(() => fsPromises.writeFile(originalBashrc, content[".bashrc"]))
		})
}


logger.warn(`\r\n[selesa][version]: ${version}\r\n`)
yargs.usage('usage: $0 <cmd>')
	.command('upload [part]', 'to upload your configurations to cloud', (yargs) => {
		yargs.positional('part', {
			type: 'string',
			choices: ["all", "vim", "bash"],
			alias: "p",
			default: 'all',
			describe: 'which part do you want to upload',
		})
	}, (argv) => {
		switch (argv.part) {
		case "all":
			push("all").catch(e => delete e.headers && logger.error(`[selesa][up]: failed to upload all parts:`, e))
			break

		case "vim":
			push("vim").catch(e => delete e.headers && logger.error(`[selesa][up]: failed to upload part vim:`, e))
			break

		case "bash":
			push("bash").catch(e => delete e.headers && logger.error(`[selesa][up]: failed to upload part bash:`, e))
			break

		default:
			break
		}
	})
	.command('download [part]', 'to download your configurations from cloud', (yargs) => {
		yargs.positional('part', {
			type: 'string',
			alias: "p",
			choices: ["all", "vim", "bash"],
			default: 'all',
			describe: 'which part do you want to download',
		})
	}, (argv) => {
		switch (argv.part) {
		case "all":
			pullAll().catch(e => delete e.headers && logger.error(`[selesa][down]: failed to download all parts:`, e))
			break

		case "vim":
			pullVim().catch(e => delete e.headers && logger.error(`[selesa][down]: failed to download part vim:`, e))
			break

		case "bash":
			pullBash().catch(e => delete e.headers && logger.error(`[selesa][down]: failed to download part bash:`, e))
			break

		default:
			break
		}
	})
	.command('config [operation]', 'to config selesa', (yargs) => {
		yargs.command("set", "to set your gist account", (yargs) => {
			yargs.positional('token', {
				type: 'string',
				alias: "t",
				describe: 'to set the token for your gist account',
			}).positional("gistid", {
				type: "string",
				alias: ["id", "i"],
				describe: "to set the gistid, '-1' to create a new one automatically",
			})
		}, (argv) => {
			const config = ini.parse(fs.readFileSync(configFile, 'utf-8'))
			// config.sync = config.sync || {}
			// config.sync[key] = value
			if (argv.token !== undefined) {
				config["token"] = argv["token"]
				return writeConfiguration(config)
			}
			if (argv.gistid !== undefined) {
				if (argv.gistid !== "-1") {
					config["gistid"] = argv["gistid"]
					return writeConfiguration(config)
				}
				return gist.createGist(config.token).then((id) => {
					config["gistid"] = id
					return writeConfiguration(config)
				})
			}
		})
			.command("get", "to get your gist account", (yargs) => {
				yargs.positional('token', {
					type: 'string',
					alias: "t",
					describe: 'to get the token for your gist account',
				}).positional("gistid", {
					type: "string",
					alias: ["id", "i"],
					describe: "to get the gistid",
				})
			}, (argv) => {
				const config = ini.parse(fs.readFileSync(configFile, 'utf-8'))
				if (argv.token !== undefined) {
					const result = config["token"] || ""
					logger.info(`[selesa][config][get]: token-->${result}`)
					return console.log(`\r\n${result}\r\n`)
				}
				if (argv.gistid !== undefined) {
					const result = config["gistid"] || ""
					logger.info(`[selesa][config][get]: gistid-->${result}`)
					return console.log(`\r\n${result}\r\n`)
				}
			})
			.command(["open", "edit"], "to edit .selesarc manually", () => { }, () => {
				const editor = process.env.EDITOR || 'vim'
				logger.info(`[selesa][config][open]: ${editor} will be used as the editor`)
				const child = child_process.spawn(editor, [configFile], {
					stdio: 'inherit',
				})
				return child.on('exit', function() {
					logger.info(`[selesa][config][open]: finished to edit the configuration`)
				})
			})
			.demandCommand(1, 'You need at least one command before moving on')
	})
	.command(["email", "send"], "to send your log files to the author", () => { }, () => {
		logger.info(`[selesa][email]: .`)
	})
	.demandCommand(1, 'You need at least one command before moving on')
	.scriptName("selesa")
	.alias("help", "h")
	.alias("version", "v")
	.strict()
	.help()
	.argv
