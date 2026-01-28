import fs from 'fs'
import path from 'path'
import os from 'os'
import { getLogger } from '../bin/log.js'

describe('log.js', ()=> {
	let testLogDir
	let logger

	beforeEach(()=> {
		// Create a temporary directory for test logs
		testLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-test-'))
	})

	afterEach(()=> {
		// Clean up test log directory
		if (fs.existsSync(testLogDir)){
			fs.rmSync(testLogDir, { recursive: true, force: true })
		}
	})

	describe('getLogger', ()=> {
		it('should return a logger instance', ()=> {
			logger = getLogger(testLogDir)

			expect(logger).toBeDefined()
			expect(typeof logger.trace).toBe('function')
			expect(typeof logger.debug).toBe('function')
			expect(typeof logger.info).toBe('function')
			expect(typeof logger.warn).toBe('function')
			expect(typeof logger.error).toBe('function')
			expect(typeof logger.fatal).toBe('function')
		})

		it('should create log files in the specified directory', ()=> {
			logger = getLogger(testLogDir)
			logger.info('Test info message')
			logger.error('Test error message')

			// Wait a bit for file writes to complete
			return new Promise((resolve)=> {
				setTimeout(()=> {
					const files = fs.readdirSync(testLogDir)
					expect(files.length).toBeGreaterThan(0)
					expect(files.some(f=> f.startsWith('info.log'))).toBe(true)
					expect(files.some(f=> f.startsWith('error.log'))).toBe(true)
					resolve()
				}, 100)
			})
		})

		it('should write info messages to info.log', (done)=> {
			logger = getLogger(testLogDir)
			const testMessage = 'Test information message'
			logger.info(testMessage)

			setTimeout(()=> {
				const infoLogPath = path.join(testLogDir, 'info.log')
				expect(fs.existsSync(infoLogPath)).toBe(true)

				const logContent = fs.readFileSync(infoLogPath, 'utf-8')
				expect(logContent).toContain(testMessage)
				expect(logContent).toContain('[INFO]')
				done()
			}, 100)
		})

		it('should write error messages to error.log', (done)=> {
			logger = getLogger(testLogDir)
			const testMessage = 'Test error message'
			logger.error(testMessage)

			setTimeout(()=> {
				const errorLogPath = path.join(testLogDir, 'error.log')
				expect(fs.existsSync(errorLogPath)).toBe(true)

				const logContent = fs.readFileSync(errorLogPath, 'utf-8')
				expect(logContent).toContain(testMessage)
				expect(logContent).toContain('[ERROR]')
				done()
			}, 100)
		})

		it('should write error messages to both info.log and error.log', (done)=> {
			logger = getLogger(testLogDir)
			const testMessage = 'Test error in both logs'
			logger.error(testMessage)

			setTimeout(()=> {
				const infoLogPath = path.join(testLogDir, 'info.log')
				const errorLogPath = path.join(testLogDir, 'error.log')

				const infoContent = fs.readFileSync(infoLogPath, 'utf-8')
				const errorContent = fs.readFileSync(errorLogPath, 'utf-8')

				expect(infoContent).toContain(testMessage)
				expect(errorContent).toContain(testMessage)
				done()
			}, 100)
		})

		it('should format log messages with timestamp and level', (done)=> {
			logger = getLogger(testLogDir)
			logger.info('Format test')

			setTimeout(()=> {
				const infoLogPath = path.join(testLogDir, 'info.log')
				const logContent = fs.readFileSync(infoLogPath, 'utf-8')

				// Check for pattern: [YYYY-MM-DD HH.MM.SS.SSS] [LEVEL] - message
				expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}\.\d{2}\.\d{2}\.\d{3}\]/)
				expect(logContent).toMatch(/\[INFO\]/)
				expect(logContent).toContain('Format test')
				done()
			}, 100)
		})

		it('should support different log levels', (done)=> {
			logger = getLogger(testLogDir)
			logger.trace('trace message')
			logger.debug('debug message')
			logger.info('info message')
			logger.warn('warn message')
			logger.error('error message')

			setTimeout(()=> {
				const infoLogPath = path.join(testLogDir, 'info.log')
				const infoContent = fs.readFileSync(infoLogPath, 'utf-8')

				expect(infoContent).toContain('trace message')
				expect(infoContent).toContain('debug message')
				expect(infoContent).toContain('info message')
				expect(infoContent).toContain('warn message')
				expect(infoContent).toContain('error message')
				done()
			}, 100)
		})

		it('should only write error level and above to error.log', (done)=> {
			logger = getLogger(testLogDir)
			logger.info('info message')
			logger.warn('warn message')
			logger.error('error message')
			logger.fatal('fatal message')

			setTimeout(()=> {
				const errorLogPath = path.join(testLogDir, 'error.log')
				const errorContent = fs.readFileSync(errorLogPath, 'utf-8')

				expect(errorContent).not.toContain('info message')
				expect(errorContent).not.toContain('warn message')
				expect(errorContent).toContain('error message')
				expect(errorContent).toContain('fatal message')
				done()
			}, 100)
		})

		it('should handle multiple logger instances with same log directory', ()=> {
			const logger1 = getLogger(testLogDir)
			const logger2 = getLogger(testLogDir)

			logger1.info('Logger 1 message')
			logger2.info('Logger 2 message')

			return new Promise((resolve)=> {
				setTimeout(()=> {
					const infoLogPath = path.join(testLogDir, 'info.log')
					const logContent = fs.readFileSync(infoLogPath, 'utf-8')

					expect(logContent).toContain('Logger 1 message')
					expect(logContent).toContain('Logger 2 message')
					resolve()
				}, 100)
			})
		})
	})
})
