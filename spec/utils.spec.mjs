import fs from 'fs'
import path from 'path'
import os from 'node:os'
import {
	checkExistence,
	createBackup,
	decrypt,
	detectBashConfigFile,
	detectGitConfigGlobalFile,
	detectHelixConfigDir,
	detectSelesaConfigPath,
	detectTigConfigFile,
	encrypt,
	generateTimestamp,
	getMetaFromConfig,
	isWindows,
	isWindows11,
	readConfig,
	validateConfig,
	writeIni,
} from '../bin/utils.js'

describe('utils.js', ()=> {
	beforeAll(()=> {
		jasmine.getEnv().allowRespy(true)
	})

	const originalEnv = { ...process.env }

	afterEach(()=> {
		Object.keys(process.env).forEach((key)=> {
			if (!(key in originalEnv)){
				delete process.env[key]
			}
		})
		Object.keys(originalEnv).forEach((key)=> {
			process.env[key] = originalEnv[key]
		})

		if (os.platform.and){
			os.platform.and.callThrough()
		}
		if (os.release.and){
			os.release.and.callThrough()
		}
	})

	describe('generateTimestamp', ()=> {
		it('should return a string starting with "v"', ()=> {
			const timestamp = generateTimestamp()
			expect(timestamp).toMatch(/^v/)
		})

		it('should contain a date in ISO format', ()=> {
			const timestamp = generateTimestamp()
			// Format: vYYYY-MM-DDTHH.MM.SS
			expect(timestamp).toMatch(/^v\d{4}-\d{2}-\d{2}T\d{2}\.\d{2}\.\d{2}$/)
		})

		it('should replace colons with dots', ()=> {
			const timestamp = generateTimestamp()
			expect(timestamp).not.toContain(':')
			expect(timestamp).toContain('.')
		})
	})

	describe('validateConfig', ()=> {
		it('should return false when token is missing', ()=> {
			const config = { gistid: '123' }
			expect(validateConfig(config)).toBe(false)
		})

		it('should return false when gistid is missing', ()=> {
			const config = { token: 'abc123' }
			expect(validateConfig(config)).toBe(false)
		})

		it('should return true when both token and gistid are present', ()=> {
			const config = { token: 'abc123', gistid: '123' }
			expect(validateConfig(config)).toBe(true)
		})

		it('should return false for empty config', ()=> {
			const config = {}
			expect(validateConfig(config)).toBe(false)
		})
	})

	describe('getMetaFromConfig', ()=> {
		it('should extract token and gistid from config', ()=> {
			const config = { token: 'abc123', gistid: '456' }
			const meta = getMetaFromConfig(config)
			expect(meta.token).toBe('abc123')
			expect(meta.gistid).toBe('456')
		})

		it('should return gistid property from config', ()=> {
			const config = { token: 'test', gistid: 'gist123' }
			const meta = getMetaFromConfig(config)
			expect(meta.gistid).toBe('gist123')
		})

		it('should handle config with undefined values', ()=> {
			const config = {}
			const meta = getMetaFromConfig(config)
			expect(meta.token).toBeUndefined()
			expect(meta.gistid).toBeUndefined()
		})
	})

	describe('encrypt and decrypt', ()=> {
		it('should encrypt a string', ()=> {
			const text = 'hello world'
			const encrypted = encrypt(text)
			expect(encrypted).toBeDefined()
			expect(encrypted).not.toBe(text)
		})

		it('should decrypt an encrypted string back to original', ()=> {
			const text = 'hello world'
			const encrypted = encrypt(text)
			const decrypted = decrypt(encrypted)
			expect(decrypted).toBe(text)
		})

		it('should handle empty string', ()=> {
			const text = ''
			const encrypted = encrypt(text)
			const decrypted = decrypt(encrypted)
			expect(decrypted).toBe(text)
		})

		it('should handle special characters', ()=> {
			const text = '!@#$%^&*()_+-=[]{}|;:,.<>?'
			const encrypted = encrypt(text)
			const decrypted = decrypt(encrypted)
			expect(decrypted).toBe(text)
		})

		it('should produce different output for different inputs', ()=> {
			const text1 = 'hello'
			const text2 = 'world'
			const encrypted1 = encrypt(text1)
			const encrypted2 = encrypt(text2)
			expect(encrypted1).not.toBe(encrypted2)
		})
	})

	describe('checkExistence', ()=> {
		it('should return true for existing file', ()=> {
			const testPath = path.resolve(process.cwd(), 'package.json')
			expect(checkExistence(testPath)).toBe(true)
		})

		it('should return false for non-existing file', ()=> {
			const testPath = path.resolve(process.cwd(), 'non-existent-file.xyz')
			expect(checkExistence(testPath)).toBe(false)
		})
	})

	describe('readConfig and writeIni', ()=> {
		const testConfigPath = path.resolve(os.tmpdir(), 'test-config.ini')

		afterEach(()=> {
			if (fs.existsSync(testConfigPath)){
				fs.unlinkSync(testConfigPath)
			}
		})

		it('should return empty object for non-existent config file', ()=> {
			const config = readConfig('/non/existent/path.ini')
			expect(config).toEqual({})
		})

		it('should write and read config', ()=> {
			const configData = {
				gistid: 'test123',
				username: 'testuser',
			}
			writeIni(testConfigPath, configData)
			const readData = readConfig(testConfigPath)
			expect(readData.gistid).toBe('test123')
			expect(readData.username).toBe('testuser')
		})

		it('should preserve config structure', ()=> {
			const configData = {
				section1: {
					key1: 'value1',
					key2: 'value2',
				},
			}
			writeIni(testConfigPath, configData)
			const readData = readConfig(testConfigPath)
			expect(readData.section1).toBeDefined()
			expect(readData.section1.key1).toBe('value1')
			expect(readData.section1.key2).toBe('value2')
		})

		it('should encrypt token when writing', ()=> {
			const configData = {
				token: 'my-secret-token',
				gistid: 'test123',
			}
			writeIni(testConfigPath, configData)
			const fileContent = fs.readFileSync(testConfigPath, 'utf-8')
			expect(fileContent).not.toContain('my-secret-token')
		})

		it('should decrypt token when reading', ()=> {
			const configData = {
				token: 'my-secret-token',
				gistid: 'test123',
			}
			writeIni(testConfigPath, configData)
			const readData = readConfig(testConfigPath)
			expect(readData.token).toBe('my-secret-token')
		})
	})

	describe('createBackup', ()=> {
		const testSourcePath = path.resolve(os.tmpdir(), 'test-source.txt')
		const testBackupDir = path.resolve(os.tmpdir(), 'test-backups')

		beforeEach(()=> {
			fs.writeFileSync(testSourcePath, 'test content')
			if (!fs.existsSync(testBackupDir)){
				fs.mkdirSync(testBackupDir)
			}
		})

		afterEach(()=> {
			if (fs.existsSync(testSourcePath)){
				fs.unlinkSync(testSourcePath)
			}
			if (fs.existsSync(testBackupDir)){
				const files = fs.readdirSync(testBackupDir)
				files.forEach((file)=> {
					fs.unlinkSync(path.resolve(testBackupDir, file))
				})
				fs.rmdirSync(testBackupDir)
			}
		})

		it('should create a backup file with timestamp', async()=> {
			const timestamp = 'v2025-12-20T10.30.00'
			await createBackup(testSourcePath, testBackupDir, 'source', timestamp)
			const backupPath = path.resolve(testBackupDir, `source.${timestamp}`)
			expect(fs.existsSync(backupPath)).toBe(true)
		})

		it('should copy file content correctly', async()=> {
			const timestamp = 'v2025-12-20T10.30.00'
			await createBackup(testSourcePath, testBackupDir, 'source', timestamp)
			const backupPath = path.resolve(testBackupDir, `source.${timestamp}`)
			const content = fs.readFileSync(backupPath, 'utf-8')
			expect(content).toBe('test content')
		})

		it('should return a promise', ()=> {
			const timestamp = 'v2025-12-20T10.30.00'
			const result = createBackup(testSourcePath, testBackupDir, 'source', timestamp)
			expect(result).toBeInstanceOf(Promise)
		})
	})

	describe('detectGitConfigGlobalFile', ()=> {
		it('should return GIT_CONFIG_GLOBAL when set', ()=> {
			process.env.GIT_CONFIG_GLOBAL = path.join('tmp', 'custom.gitconfig')
			const result = detectGitConfigGlobalFile()
			expect(result).toBe(process.env.GIT_CONFIG_GLOBAL)
		})

		it('should use XDG_CONFIG_HOME when set', ()=> {
			delete process.env.GIT_CONFIG_GLOBAL
			process.env.XDG_CONFIG_HOME = path.join('tmp', 'xdg')
			const result = detectGitConfigGlobalFile()
			expect(result).toBe(path.join(process.env.XDG_CONFIG_HOME, 'git', 'config'))
		})

		it('should fallback to ~/.gitconfig when no env set', ()=> {
			delete process.env.GIT_CONFIG_GLOBAL
			delete process.env.XDG_CONFIG_HOME
			const result = detectGitConfigGlobalFile()
			expect(result).toBe(path.join(os.homedir(), '.gitconfig'))
		})
	})

	describe('detectTigConfigFile', ()=> {
		it('should return TIGRC_USER when set', ()=> {
			process.env.TIGRC_USER = path.join('tmp', 'custom.tigrc')
			const result = detectTigConfigFile()
			expect(result).toBe(process.env.TIGRC_USER)
		})

		it('should use XDG_CONFIG_HOME when set', ()=> {
			delete process.env.TIGRC_USER
			process.env.XDG_CONFIG_HOME = path.join('tmp', 'xdg')
			const result = detectTigConfigFile()
			expect(result).toBe(path.join(process.env.XDG_CONFIG_HOME, 'tig', 'config'))
		})

		it('should fallback to ~/.tigrc when no env set', ()=> {
			delete process.env.TIGRC_USER
			delete process.env.XDG_CONFIG_HOME
			const result = detectTigConfigFile()
			expect(result).toBe(path.join(os.homedir(), '.tigrc'))
		})
	})

	describe('detectHelixConfigDir', ()=> {
		it('should use APPDATA on Windows', ()=> {
			process.env.APPDATA = path.join('tmp', 'appdata')
			spyOn(os, 'platform').and.returnValue('win32')
			const result = detectHelixConfigDir()
			expect(result).toBe(path.join(process.env.APPDATA, 'helix'))
		})

		it('should use XDG_CONFIG_HOME on Unix', ()=> {
			process.env.XDG_CONFIG_HOME = path.join('tmp', 'xdg')
			spyOn(os, 'platform').and.returnValue('linux')
			const result = detectHelixConfigDir()
			expect(result).toBe(path.join(process.env.XDG_CONFIG_HOME, 'helix'))
		})
	})

	describe('detectSelesaConfigPath', ()=> {
		it('should use APPDATA and LOCALAPPDATA on Windows', ()=> {
			process.env.APPDATA = path.join('tmp', 'appdata')
			process.env.LOCALAPPDATA = path.join('tmp', 'localappdata')
			spyOn(os, 'platform').and.returnValue('win32')
			const result = detectSelesaConfigPath()
			expect(result.selesaConfig).toBe(path.join(process.env.APPDATA, 'selesa', 'config.ini'))
			expect(result.selesaBackupDir).toBe(path.join(process.env.LOCALAPPDATA, 'selesa', 'Backups'))
			expect(result.selesaLogDir).toBe(path.join(process.env.LOCALAPPDATA, 'selesa', 'Logs'))
		})

		it('should use XDG dirs on Unix', ()=> {
			process.env.XDG_CONFIG_HOME = path.join('tmp', 'xdg-config')
			process.env.XDG_DATA_HOME = path.join('tmp', 'xdg-data')
			process.env.XDG_STATE_HOME = path.join('tmp', 'xdg-state')
			spyOn(os, 'platform').and.returnValue('linux')
			const result = detectSelesaConfigPath()
			expect(result.selesaConfig).toBe(path.join(process.env.XDG_CONFIG_HOME, 'selesa', 'config.ini'))
			expect(result.selesaBackupDir).toBe(path.join(process.env.XDG_DATA_HOME, 'selesa', 'backups'))
			expect(result.selesaLogDir).toBe(path.join(process.env.XDG_STATE_HOME, 'selesa', 'logs'))
		})
	})

	describe('detectBashConfigFile', ()=> {
		it('should return ~/.bashrc path', ()=> {
			const result = detectBashConfigFile()
			expect(result).toBe(path.join(os.homedir(), '.bashrc'))
		})
	})

	describe('isWindows', ()=> {
		it('should return true on win32', ()=> {
			spyOn(os, 'platform').and.returnValue('win32')
			expect(isWindows()).toBe(true)
		})

		it('should return false on non-win32', ()=> {
			spyOn(os, 'platform').and.returnValue('linux')
			expect(isWindows()).toBe(false)
		})
	})

	describe('isWindows11', ()=> {
		it('should return true for build >= 22000 on win32', ()=> {
			spyOn(os, 'platform').and.returnValue('win32')
			spyOn(os, 'release').and.returnValue('10.0.22000')
			expect(isWindows11()).toBe(true)
		})

		it('should return false for build < 22000 on win32', ()=> {
			spyOn(os, 'platform').and.returnValue('win32')
			spyOn(os, 'release').and.returnValue('10.0.19045')
			expect(isWindows11()).toBe(false)
		})

		it('should return false on non-win32', ()=> {
			spyOn(os, 'platform').and.returnValue('linux')
			expect(isWindows11()).toBe(false)
		})
	})
})
