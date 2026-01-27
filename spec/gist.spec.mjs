import gist from '../bin/gist.js'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

describe('gist.js', ()=> {
	let testGistId

	beforeAll(async()=> {
		// Create a test gist before all tests
		if (!GITHUB_TOKEN){
			pending('GITHUB_TOKEN not provided')
		}
		try {
			testGistId = await gist.createGist(GITHUB_TOKEN)
			console.log('Created test gist:', testGistId)
		} catch(error){
			console.error('Failed to create test gist:', error.message)
			pending('Failed to create test gist')
		}
	}, 10000)

	afterAll(async()=> {
		// Clean up test gist after all tests
		if (testGistId){
			try {
				await gist.deleteGist(GITHUB_TOKEN, testGistId)
				console.log('Deleted test gist:', testGistId)
			} catch(error){
				console.error('Failed to delete test gist:', error.message)
			}
		}
	}, 10000)

	describe('createGist', ()=> {
		it('should create a gist and return gist id', async()=> {
			const gistId = await gist.createGist(GITHUB_TOKEN)

			expect(gistId).toBeDefined()
			expect(typeof gistId).toBe('string')
			expect(gistId.length).toBeGreaterThan(0)

			// Clean up
			await gist.deleteGist(GITHUB_TOKEN, gistId)
		}, 10000)
	})

	describe('query', ()=> {
		it('should query gist and return file contents', async()=> {
			// Use a separate gist for query test to avoid test order dependency
			const queryTestGistId = await gist.createGist(GITHUB_TOKEN)

			const result = await gist.query(GITHUB_TOKEN, queryTestGistId)

			expect(result).toBeDefined()
			expect(result['.bashrc']).toBeUndefined()
			expect(result['.bash_profile']).toBeUndefined()
			expect(result['helix_config.toml']).toBeUndefined()
			expect(result['helix_languages.toml']).toBeUndefined()
			expect(result['.gitconfig']).toBeUndefined()
			expect(result['config']).toBeUndefined()

			// Clean up
			await gist.deleteGist(GITHUB_TOKEN, queryTestGistId)
		}, 10000)
	})

	describe('update', ()=> {
		it('should update gist with valid files', async()=> {
			const files = {
				'.bashrc': { content: 'export PATH=/usr/local/bin:$PATH' },
				'.gitconfig': { content: '[user]\n  name = Test' },
			}

			await gist.update(GITHUB_TOKEN, testGistId, files)

			// Query to verify update
			const result = await gist.query(GITHUB_TOKEN, testGistId)
			expect(result['.bashrc']).toBe('export PATH=/usr/local/bin:$PATH')
			expect(result['.gitconfig']).toBe('[user]\n  name = Test')
		}, 10000)

		it('should handle files with empty content (should not error)', async()=> {
			const files = {
				'.bashrc': { content: 'export PATH=/usr/local/bin:$PATH' },
				'.gitconfig': { content: '' },
			}

			// Should not throw error
			await expectAsync(gist.update(GITHUB_TOKEN, testGistId, files)).toBeResolved()

			// Query to verify only non-empty file was updated
			const result = await gist.query(GITHUB_TOKEN, testGistId)
			expect(result['.bashrc']).toBe('export PATH=/usr/local/bin:$PATH')
		}, 10000)

		it('should handle files with whitespace-only content', async()=> {
			const files = {
				'.bashrc': { content: 'export PATH=/usr/local/bin:$PATH' },
				'.gitconfig': { content: '   ' },
				config: { content: '\t\t' },
			}

			// Should not throw error
			await expectAsync(gist.update(GITHUB_TOKEN, testGistId, files)).toBeResolved()

			const result = await gist.query(GITHUB_TOKEN, testGistId)
			expect(result['.bashrc']).toBe('export PATH=/usr/local/bin:$PATH')
		}, 10000)

		it('should handle files with only newlines (edge case)', async()=> {
			const files = {
				'.bashrc': { content: 'export PATH=/usr/local/bin:$PATH' },
				'.gitconfig': { content: '\n' },
				config: { content: '\n\n\n' },
			}

			// Should not throw error - empty content files should be filtered out
			await expectAsync(gist.update(GITHUB_TOKEN, testGistId, files)).toBeResolved()

			const result = await gist.query(GITHUB_TOKEN, testGistId)
			expect(result['.bashrc']).toBe('export PATH=/usr/local/bin:$PATH')
		}, 10000)

		it('should handle files with mixed whitespace and newlines', async()=> {
			const files = {
				'.bashrc': { content: 'export PATH=/usr/local/bin:$PATH' },
				'.gitconfig': { content: ' \n \t \n ' },
			}

			await expectAsync(gist.update(GITHUB_TOKEN, testGistId, files)).toBeResolved()

			const result = await gist.query(GITHUB_TOKEN, testGistId)
			expect(result['.bashrc']).toBe('export PATH=/usr/local/bin:$PATH')
		}, 10000)

		it('should handle empty string edge case', async()=> {
			const files = {
				'.bashrc': { content: '' },
			}

			// Should not throw error
			await expectAsync(gist.update(GITHUB_TOKEN, testGistId, files)).toBeResolved()
		}, 10000)

		it('should handle single newline edge case', async()=> {
			const files = {
				'.bashrc': { content: '\n' },
			}

			// Should not throw error
			await expectAsync(gist.update(GITHUB_TOKEN, testGistId, files)).toBeResolved()
		}, 10000)

		it('should handle carriage return edge case', async()=> {
			const files = {
				'.bashrc': { content: '\r' },
			}

			// Should not throw error
			await expectAsync(gist.update(GITHUB_TOKEN, testGistId, files)).toBeResolved()
		}, 10000)

		it('should handle CRLF edge case', async()=> {
			const files = {
				'.bashrc': { content: '\r\n' },
			}

			// Should not throw error
			await expectAsync(gist.update(GITHUB_TOKEN, testGistId, files)).toBeResolved()
		}, 10000)

		it('should preserve files with valid content including leading/trailing whitespace', async()=> {
			const files = {
				'.bashrc': { content: '  export PATH=/usr/local/bin:$PATH  ' },
				'.gitconfig': { content: ' [user]\n  name = Test ' },
			}

			await gist.update(GITHUB_TOKEN, testGistId, files)

			// Files with actual content should be preserved even with whitespace
			const result = await gist.query(GITHUB_TOKEN, testGistId)
			expect(result['.bashrc']).toBe('  export PATH=/usr/local/bin:$PATH  ')
			expect(result['.gitconfig']).toBe(' [user]\n  name = Test ')
		}, 10000)
	})

	describe('deleteGist', ()=> {
		it('should delete a gist', async()=> {
			// Create a temporary gist for deletion test
			const tempGistId = await gist.createGist(GITHUB_TOKEN)

			// Delete it
			await expectAsync(gist.deleteGist(GITHUB_TOKEN, tempGistId)).toBeResolved()

			// Try to query it (should fail or return undefined)
			try {
				await gist.query(GITHUB_TOKEN, tempGistId)
				fail('Should have thrown an error for deleted gist')
			} catch(error){
				expect(error).toBeDefined()
			}
		}, 10000)
	})
})
