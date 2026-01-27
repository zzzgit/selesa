import fs from 'fs'
import path from 'path'
import os from 'os'
import {
	checkExistence,
	createBackup,
	decrypt,
	encrypt,
	generateTimestamp,
	getMetaFromConfig,
	readConfig,
	validateConfig,
	writeIni,
} from '../bin/utils.js'

describe('utils.js', ()=> {
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
})
