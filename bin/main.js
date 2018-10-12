#!/usr/bin/env node
const os = require("os")
const path = require("path")
const fs = require("fs")
const fsx = require("fs-extra")
const fsPromises = fs.promises
const { execFile } = require('child_process')
const child_process = require('child_process')
const yargs = require("yargs")
const ini = require('ini')
const logFactory = require("./log.js")

const homedir = os.homedir()
const originalVimrc = path.resolve(homedir, ".vimrc")
const originalBashrc = path.resolve(homedir, ".bashrc")
const originalBashProfile = path.resolve(homedir, ".bash_profile")
const magazine = path.resolve(__dirname, "../rc")	// will be removed in the future, it should be in .selesa.cache
const selesa = path.resolve(homedir, ".selesa")
const cache = path.resolve(selesa, ".cache")
const log = path.resolve(selesa, ".log")
const newBashrc = path.resolve(magazine, ".bashrc")
const newVimrc = path.resolve(magazine, ".vimrc")
const newBashrofile = path.resolve(magazine, ".bash_profile")


const logger = logFactory.getLogger(log)

const ensureFiles = () => {
	logger.info(`[selesa]: ensure cache folder and configuration files`)
	return fsx.ensureDir(cache)
		.then(() => fsx.ensureDir(log))
		.then(() => fsx.ensureFile(originalBashProfile)
			.then(() => fsx.ensureFile(originalBashrc))
			.then(() => fsx.ensureFile(originalVimrc)))
}

const pullAll = () => {
	logger.info(`[selesa]: begin to pull all configuration`)
	return Promise.all([pullVim(), pullBash()])
}

const pullVim = () => {
	logger.info(`[selesa]: begin to pull vim configuration`)
	return ensureFiles()
		.then(() => fsPromises.copyFile(originalVimrc, path.resolve(cache, `.vimrc.${new Date().valueOf()}`))
			.then(() => fsPromises.copyFile(newVimrc, originalVimrc)))
}

const pullBash = () => {
	logger.info(`[selesa]: begin to pull bash configuration`)
	return ensureFiles()
		.then(() => fsPromises.copyFile(originalBashProfile, path.resolve(cache, `.bash_profile.${new Date().valueOf()}`)))
		.then(() => fsPromises.copyFile(originalBashrc, path.resolve(cache, `.bashrc.${new Date().valueOf()}`)))
		.then(() => fsPromises.copyFile(newBashrc, originalBashrc))
		.then(() => fsPromises.copyFile(newBashrofile, originalBashProfile))
}


yargs.usage('usage: $0 <cmd> [args]')
	.command('upload [part]', 'upload your configurations to cloud!', (yargs) => {
		yargs.positional('part', {
			type: 'string',
			choices: ["all", "vim", "bash"],
			alias: "p",
			default: 'all',
			describe: 'which part do you want to upload'
		})
	}, (argv) => {
		let child = execFile('sh', [path.resolve(__dirname, './upload.sh')], (error, stdout, stderr) => {
			if (error) {
				logger.error(`[selesa]: ${error}`)
				throw error
			}
			process.exit(0)
		})
	})
	.command('download [part]', 'download your configurations from cloud!', (yargs) => {
		yargs.positional('part', {
			type: 'string',
			alias: "p",
			choices: ["all", "vim", "bash"],
			default: 'all',
			describe: 'which part do you want to download'
		})
	}, (argv) => {
		switch (argv.part) {
		case "all":
			pullAll().catch(e => logger.error(`[selesa]: failed to pull all parts`, e))
			break

		case "vim":
			pullVim().catch(e => logger.error(`[selesa]: failed to pull part vim`, e))
			break

		case "bash":
			pullBash().catch(e => logger.error(`[selesa]: failed to pull part bash`, e))
			break

		default:
			break
		}
		// let child = execFile('sh', [path.resolve(__dirname, './download.sh')], (error, stdout, stderr) => {
		//     if (error) {
		//         throw error
		//     }
		//     console.log(stdout);
		//     process.exit(0)
		// })
	})
	.command('config [operation]', 'config selesa', (yargs) => {
		// npm config set < key > <value>
		// npm config get [<key>]
		// npm config delete <key>

		// npm config list [--json]
		// npm config edit
		// npm set <key> <value>

		// npm get [<key>]

		// alias: c
		yargs.positional("set", {
			type: 'string',
			describe: 'gist user name',
			choices: ["username", "token"],
			conflicts: ["open", "get"]
		}).positional("get", {
			type: 'string',
			describe: 'gist user name',
			choices: ["username", "token"],
			conflicts: ["set", "open"]
		}).positional("open", {
			type: 'boolean',
			alias: 'edit',
			describe: 'edit configuration file in vim',
			conflicts: ["set", "get"]
		})
	}, (argv) => {
		let file = path.resolve(homedir, ".selesarc")
		let config = ini.parse(fs.readFileSync(file, 'utf-8'))
		if (argv.open || argv.edit) {
			let editor = process.env.EDITOR || 'vim'
			let child = child_process.spawn(editor, [file], {
				stdio: 'inherit'
			})
			return child.on('exit', function (e, code) {
				console.log("finished")
			})
		}
		if (argv.get) {
			let result = (config.sync ? config.sync[argv.get] : "") || ""
			return console.log(result)
		}
		let key = argv.set
		let value = argv.operation || ""
		//config.sync = config.sync || {}
		//config.sync[key] = value
		config[key] = value
		fs.writeFileSync(file, ini.stringify(config, { section: '' }))

		//return config[argv.get] = 
	})
	.demandCommand(1, 'You need at least one command before moving on')
	.scriptName("selesa")
	.alias("help", "h")
	.alias("version", "v")
	.strict()
	.help()
	.argv

