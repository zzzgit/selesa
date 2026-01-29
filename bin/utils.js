import ini from 'ini'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import process from 'node:process'

const fsPromises = fs.promises
const homedir = os.homedir()
const key = 'abcdefghijklmnopqrstuvwxyz0123456789'

const readConfig = (filePath)=> {
	if (!checkExistence(filePath)){
		return {}
	}
	const config = ini.parse(fs.readFileSync(filePath, 'utf-8'))
	if (config.token){
		config.token = decrypt(config.token)
	}
	return config
}

const writeIni = (filePath, data)=> {
	if (data.token){
		data.token = encrypt(data.token)
	}
	fs.writeFileSync(filePath, ini.stringify(data, { section: '' }))
}

const encrypt = (text)=> {
	return [...text].map((char, i)=> {
		const charCode = char.charCodeAt(0) ^ key.charCodeAt(i % key.length)
		return String.fromCharCode(charCode)
	}).join('')
}

const decrypt = (encrypted)=> {
	return encrypt(encrypted)
}

const generateTimestamp = ()=> {
	return 'v' + new Date().toISOString().replace(/\..+/, '')
		.replace(/:/g, '.')
}

const validateConfig = (config)=> {
	if (!config.token){
		return false
	}
	if (!config.gistid){
		return false
	}
	return true
}

const getMetaFromConfig = (config)=> {
	return {
		token: config.token,
		gistid: config.gistid,
	}
}

const createBackup = (sourcePath, backupDir, fileName, timestamp)=> {
	const backupPath = path.resolve(backupDir, `${fileName}.${timestamp}`)
	return fsPromises.copyFile(sourcePath, backupPath)
}

const checkExistence = (path)=> {
	return fs.existsSync(path)
}

const detectGitConfigGlobalFile = ()=> {
	if (process.env.GIT_CONFIG_GLOBAL){
		return process.env.GIT_CONFIG_GLOBAL
	}
	if(process.env.XDG_CONFIG_HOME){
		return composeXDGFilePathUnix('git', '', 'config')
	}
	return composeTraditionalFilePathUnix('', '', '.gitconfig')
}

const detectTigConfigFile = ()=> {
	if (process.env.TIGRC_USER){
		return process.env.TIGRC_USER
	}
	if(process.env.XDG_CONFIG_HOME){
		return composeXDGFilePathUnix('tig', '', 'config')
	}
	return composeTraditionalFilePathUnix('', '', '.tigrc')
}

const detectHelixConfigDir = ()=> {
	if(os.platform() === 'win32'){
		return path.join(_getAppDataPathWindows11(), 'helix')
	}
	return path.join(_getXDGConfigDirUnix(), 'helix')
}

const detectSelesaConfigPath = ()=> {
	if(os.platform() === 'win32'){
		const appDataDir = _getAppDataPathWindows11()
		const localAppDataDir = _getLocalAppDataPathWindows11()
		return {
			selesaConfig: path.join(appDataDir, 'selesa', 'config.ini'),
			selesaBackupDir: path.join(localAppDataDir, 'selesa', 'Backups'),
			selesaLogDir: path.join(localAppDataDir, 'selesa', 'Logs'),
		}
	}
	return {
		selesaConfig: path.join(_getXDGConfigDirUnix(), 'selesa', 'config.ini'),
		selesaBackupDir: path.join(_getXDGDataDirUnix(), 'selesa', 'backups'),
		selesaLogDir: path.join(_getXDGStateDirUnix(), 'selesa', 'logs'),
	}
}

const detectBashConfigFile = ()=> {
	return path.join(homedir, '.bashrc')
}

const detectPowerShellConfigFile = ()=> {
	if (os.platform() === 'win32'){
		return path.join(homedir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1')
	}
	return path.join(_getXDGConfigDirUnix(), 'powershell', 'Microsoft.PowerShell_profile.ps1')
}

const _getTraditionalConfigDirUnix = ()=> {
	return homedir
}

const _getXDGConfigDirUnix = ()=> {
	return process.env.XDG_CONFIG_HOME || path.join(homedir, '.config')
}

const _getXDGStateDirUnix = ()=> {
	return process.env.XDG_STATE_HOME || path.join(homedir, '.local', 'state')
}

const _getXDGDataDirUnix = ()=> {
	return process.env.XDG_DATA_HOME || path.join(homedir, '.local', 'share')
}

const composeTraditionalFilePathUnix = (appName, pathName, fileName)=> {
	return path.join(_getTraditionalConfigDirUnix(), pathName, fileName)
}

const composeXDGFilePathUnix = (appName, pathName, fileName)=> {
	return path.join(_getXDGConfigDirUnix(), appName, fileName)
}

const isWindows11 = ()=> {
	if (os.platform() !== 'win32'){
		return false
	}
	const release = os.release()
	const parts = release.split('.')
	if (parts.length >= 3){
		const build = parseInt(parts[2], 10)
		return build >= 22000
	}

	return false
}

const isWindows = ()=> {
	return os.platform() === 'win32'
}

const _getAppDataPathWindows11 = ()=> {
	return process.env.APPDATA
}

const _getLocalAppDataPathWindows11 = ()=> {
	return process.env.LOCALAPPDATA
}

export {
	encrypt,
	decrypt,
	readConfig,
	writeIni,
	checkExistence,
	generateTimestamp,
	validateConfig,
	getMetaFromConfig,
	createBackup,
	detectGitConfigGlobalFile,
	detectTigConfigFile,
	detectHelixConfigDir,
	detectSelesaConfigPath,
	detectBashConfigFile,
	isWindows11,
	isWindows,
	detectPowerShellConfigFile,

}
