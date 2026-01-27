#!/usr/bin/env node
import child_process from 'node:child_process'
import path from 'node:path'
import fsPromises from 'node:fs/promises'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import packageJson from '../package.json' with { type: 'json' }
import gist from './gist.js'
import { ensureDir } from 'dakini'
import {
	createBackup,
	detectGitConfigGlobalFile,
	detectHelixConfigDir,
	detectSelesaConfigPath,
	detectTigConfigFile,
	generateTimestamp,
	getMetaFromConfig,
	isWindows,
	isWindows11,
	readConfig,
	validateConfig,
	writeIni,
} from './utils.js'

if(isWindows()){
	if(!isWindows11()){
		console.error('[selesa]: only Windows 11 is supported.')
		process.exit(1)
	}
}

const getFilePathMap = (part)=> {
	const mappings = {
		bash: {
			// '.bashrc': detectGitConfigGlobalFile(),
			// '.bash_profile': paths.originalBashProfile,
		},
		helix: {
			'helix_config.toml': path.join(detectHelixConfigDir(), 'config.toml'),
			'helix_languages.toml': path.join(detectHelixConfigDir(), 'languages.toml'),
		},
		git: {
			'.gitconfig': detectGitConfigGlobalFile(),
		},
		tig: {
			config: detectTigConfigFile(),
		},
		selesa: detectSelesaConfigPath(),
	}
	const result = new Map()
	const obj2set = (partObj)=> {
		for (const [key, value] of Object.entries(partObj)){
			result.set(key, value)
		}
	}
	if (part === 'all'){
		for (const [key, partObj] of Object.entries(mappings)){
			if (key === 'selesa'){ continue }
			obj2set(partObj)
		}
	}else {
		obj2set(mappings[part])
	}
	return result
}

// const logger = logFactory.getLogger(log)
const logger = console
const time_s = generateTimestamp()
const version = packageJson.version
let meta = {}

const ensureConfigFiles = async(paths)=> {
	logger.info('[selesa]: ensure cache folder and configuration files')
	await ensureDir(paths.selesaBackupDir)
	await ensureDir(paths.selesaLogDir)
	await ensureDir(path.dirname(paths.selesaConfig))
	await fsPromises.appendFile(paths.selesaConfig, '')
}

const selesaPaths = detectSelesaConfigPath()
await ensureConfigFiles(selesaPaths)

const saveConfig = (config)=> {
	logger.info(`[selesa][saveConfig]: \r\n${JSON.stringify(config)}`)
	writeIni(selesaPaths.selesaConfig, config)
}

const readConfigAndUpdateMeta = ()=> {
// no need to check existence here, as readConfig will return empty object if not exist
	const config = readConfig(selesaPaths.selesaConfig)
	const isvalid = validateConfig(config)
	if (!isvalid){
		return false
	}
	meta = getMetaFromConfig(config)
	return true
}

const readFileOrEmpty = (filePath)=> {
	return fsPromises.readFile(filePath, { encoding: 'utf8' })
		.catch((error)=> {
			// if the file not exist, then empty content will be returned
			if (error?.code === 'ENOENT'){
				return ''
			}
			throw error
		})
}

const upload = async(parts)=> {
	if (!readConfigAndUpdateMeta()){
		return Promise.reject('Please set up your configuration first, by running `selesa config set --token <your-token> --gistid <your-gist-id>` ')
	}
	logger.info(`[selesa]: begin to upload, ${parts}`)

	const namePath_map = getFilePathMap(parts)
	const entries_arr = [...namePath_map.entries()]
	const promises_arr = entries_arr.map(([_name, localPath])=> readFileOrEmpty(localPath))
	const contents_arr = await Promise.all(promises_arr)
	const files = {}
	entries_arr.forEach(([gistKey], index)=> {
		files[gistKey] = { content: contents_arr[index] }
	})
	files['..selesa'] = {
		content: JSON.stringify({ lastUpload: new Date().toISOString(), version: version }),
	}

	return gist.update(meta.token, meta.gistid, files)
}

const fetchAll = async()=> {
	if (!readConfigAndUpdateMeta()){
		return Promise.reject('Please set up your configuration first, by running `selesa config set --token <your-token> --gistid <your-gist-id>` ')
	}
	logger.info('[selesa]: begin to download all configuration')
	return await gist.query(meta.token, meta.gistid)
}

const downloadAll = async()=> {
	const content = await fetchAll()
	const filePathMap = getFilePathMap('all')
	// if (content['.bash_profile']){
	// 	await backupAndReplace(content, '.bash_profile', originalBashProfile)
	// }
	// if (content['.bashrc']){
	// 	await backupAndReplace(content, '.bashrc', originalBashrc)
	// }
	if (content['helix_config.toml']){
		await backupAndReplace(content, 'helix_config.toml', filePathMap.get('helix_config.toml'))
	}
	if (content['helix_languages.toml']){
		await backupAndReplace(content, 'helix_languages.toml', filePathMap.get('helix_languages.toml'))
	}
	if (content['.gitconfig']){
		await backupAndReplace(content, '.gitconfig', filePathMap.get('.gitconfig'))
	}
	if (content['config']){
		await backupAndReplace(content, 'config', filePathMap.get('config'))
	}
}

const downloadBash = async()=> {
	// const content = await fetchAll()
	// if(content['.bashrc']){
	// 	await backupAndReplace(content, '.bashrc', originalBashrc)
	// }
	// if(content['.bash_profile']){
	// 	await backupAndReplace(content, '.bash_profile', originalBashProfile)
	// }
}

const downloadHelix = async()=> {
	const content = await fetchAll()
	const filePathMap = getFilePathMap('helix')
	if(content['helix_config.toml']){
		await backupAndReplace(content, 'helix_config.toml', filePathMap.get('helix_config.toml'))
	}
	if(content['helix_languages.toml']){
		await backupAndReplace(content, 'helix_languages.toml', filePathMap.get('helix_languages.toml'))
	}
}

const downloadGit = async()=> {
	const content = await fetchAll()
	const filePathMap = getFilePathMap('git')
	if(content['.gitconfig']){
		await backupAndReplace(content, '.gitconfig', filePathMap.get('.gitconfig'))
	}
}

const backupAndReplace = async(fetched, fileName, originalFile)=> {
	await createBackup(originalFile, selesaPaths.selesaBackupDir, fileName, time_s)
	await fsPromises.writeFile(originalFile, fetched[fileName])
}

const downloadTig = async()=> {
	const content = await fetchAll()
	const filePathMap = getFilePathMap('tig')
	if(content['config']){
		await backupAndReplace(content, 'config', filePathMap.get('config'))
	}
}

const argv = yargs(hideBin(process.argv))
argv.usage('usage: $0 <cmd>')
	.command('upload [part]', 'to upload your configurations to cloud', (yargs)=> {
		yargs.positional('part', {
			type: 'string',
			choices: ['all', 'bash', 'helix', 'git', 'tig'],
			alias: 'p',
			default: 'all',
			describe: 'which part do you want to upload',
		})
	}, (argv)=> {
		if(!readConfigAndUpdateMeta()){
			return Promise.reject('Please set up your configuration first, by running `selesa config set --token <your-token> --gistid <your-gist-id>` ')
		}
		switch (argv.part){
			case 'all':
				upload('all').catch(e=> delete e.headers && logger.error('[selesa][up]: failed to upload all parts:', e))
				break
			case 'bash':
				upload('bash').catch(e=> delete e.headers && logger.error('[selesa][up]: failed to upload part bash:', e))
				break
			case 'helix':
				upload('helix').catch(e=> delete e.headers && logger.error('[selesa][up]: failed to upload part helix:', e))
				break
			case 'git':
				upload('git').catch(e=> delete e.headers && logger.error('[selesa][up]: failed to upload part git:', e))
				break
			case 'tig':
				upload('tig').catch(e=> delete e.headers && logger.error('[selesa][up]: failed to upload part tig:', e))
				break

			default:
				break
		}
	})
	.command('download [part]', 'to download your configurations from cloud', (yargs)=> {
		yargs.positional('part', {
			type: 'string',
			alias: 'p',
			choices: ['all', 'bash', 'helix', 'git', 'tig'],
			default: 'all',
			describe: 'which part do you want to download',
		})
	}, (argv)=> {
		if(!readConfigAndUpdateMeta()){
			return Promise.reject('Please set up your configuration first, by running `selesa config set --token <your-token> --gistid <your-gist-id>` ')
		}
		switch (argv.part){
			case 'bash':
				downloadBash().catch(e=> delete e.headers && logger.error('[selesa][down]: failed to download part bash:', e))
				break
			case 'helix':
				downloadHelix().catch(e=> delete e.headers && logger.error('[selesa][down]: failed to download part helix:', e))
				break
			case 'git':
				downloadGit().catch(e=> delete e.headers && logger.error('[selesa][down]: failed to download part git:', e))
				break
			case 'tig':
				downloadTig().catch(e=> delete e.headers && logger.error('[selesa][down]: failed to download part tig:', e))
				break
			case 'all':
				downloadAll().catch(e=> delete e.headers && logger.error('[selesa][down]: failed to download all parts:', e))
				break

			default:
				downloadAll().catch(e=> delete e.headers && logger.error('[selesa][down]: failed to download all parts:', e))
		}
	})
	.command('config [operation]', 'to config selesa', (yargs)=> {
		yargs.command('set', 'to set your gist account', (yargs)=> {
			yargs.positional('token', {
				type: 'string',
				alias: 't',
				describe: 'to set the token for your gist account',
			}).positional('gistid', {
				type: 'string',
				alias: ['id', 'i'],
				describe: 'to set the gistid',
			})
		}, (argv)=> {
			const config = readConfig(selesaPaths.selesaConfig)
			if (argv.token !== undefined){
				config['token'] = argv['token']
				return saveConfig(config)
			}
			if (argv.gistid !== undefined){
				config['gistid'] = argv['gistid']
				return saveConfig(config)
			}
		})
			.command('get', 'to get your gist account', (yargs)=> {
				yargs.positional('token', {
					type: 'string',
					alias: 't',
					describe: 'to get the token for your gist account',
				}).positional('gistid', {
					type: 'string',
					alias: ['id', 'i'],
					describe: 'to get the gistid',
				})
			}, (argv)=> {
				const config = readConfig(selesaPaths.selesaConfig)
				if (argv.token !== undefined){
					const result = config['token']
					logger.info(`[selesa][config][get]: token-->${result}`)
					return console.log(`\r\n${result}\r\n`)
				}
				if (argv.gistid !== undefined){
					const result = config['gistid']
					logger.info(`[selesa][config][get]: gistid-->${result}`)
					return console.log(`\r\n${result}\r\n`)
				}
			})
			.command(['open', 'edit'], 'to edit config.ini manually', ()=> { }, ()=> {
				const editor = process.env.EDITOR || 'hx'
				logger.info(`[selesa][config][open]: ${editor} will be used as the editor`)
				const child = child_process.spawn(editor, [selesaPaths.selesaConfig], {
					stdio: 'inherit',
				})
				return child.on('exit', ()=> {
					logger.info('[selesa][config][open]: finished to edit the configuration')
				})
			})
			.demandCommand(1, 'You need at least one command before moving on')
			.command('reset', 'to reset your selesa config', ()=> { }, ()=> {
				logger.info('[selesa][config][reset]: resetting configuration')
				fsPromises.unlink(selesaPaths.selesaConfig).then(()=> {
					logger.info('[selesa][config][reset]: configuration reset successfully')
					console.log('\r\nConfiguration reset successfully!\r\n')
					return null
				}).catch((e)=> {
					logger.error('[selesa][config][reset]: failed to reset configuration:', e)
				})
			})
	})
	.command(['email', 'send'], 'to send your log files to the author', ()=> { }, ()=> {
		logger.info('[selesa][email]: .')
	})
	.command('delete', 'to delete your gist', ()=> { }, ()=> {
		if(!readConfigAndUpdateMeta()){
			return Promise.reject('Please set up your configuration first, by running `selesa config set --token <your-token> --gistid <your-gist-id>` ')
		}
		logger.info(`[selesa][delete]: deleting gist ${meta.gistid}`)
		return gist.deleteGist(meta.token, meta.gistid)
			.then(()=> {
				logger.info('[selesa][delete]: gist deleted successfully')
				console.log('\r\nGist deleted successfully\r\n')
				return null
			})
			.catch((e)=> {
				delete e.headers
				logger.error('[selesa][delete]: failed to delete gist:', e)
			})
	})
	.command('create', 'to create your gist', ()=> { }, ()=> {
		const config = readConfig(selesaPaths.selesaConfig)
		if (!config?.token){
			return Promise.reject('Please set up your token first, by running `selesa config set --token <your-token>` ')
		}
		logger.info('[selesa][create]: creating a new gist')
		return gist.createGist(config.token)
			.then((id)=> {
				config['gistid'] = id
				saveConfig(config)
				logger.info(`[selesa][create]: gist created successfully with id: ${id}`)
				console.log(`\r\n${id}\r\n`)
				return null
			})
			.catch((e)=> {
				delete e.headers
				logger.error('[selesa][create]: failed to create gist:', e)
			})
	})
	.demandCommand(1, 'You need at least one command before moving on')
	.scriptName('selesa')
	.alias('help', 'h')
	.alias('version', 'v')
	.strict()
	.help()
	.fail((msg, err, yargs)=> {
		if (err){
			logger.error('[selesa]: unexpected error:', err)
		} else {
			console.log(yargs.help())
		}
		process.exit(1)
	})
	.parse()
