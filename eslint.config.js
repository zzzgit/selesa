import js from 'eslint-config-janus/js.js'
// import mocha from 'eslint-config-janus/mocha.js'
import { jsify } from 'eslint-config-janus/utils.js'
import globals from 'globals'

const testGlob = 'spec/**/*.js'
const testTsArr = jsify([{ languageOptions: { globals: globals.jasmine } }], { files: [testGlob] })

export default [
	...js,
	...testTsArr,
	{
		languageOptions: {
			parserOptions: {
				sourceType: 'module',
			},
			globals: {
				chrome: 'readonly',
				...globals.node,
				// ...globals.browser,
			},
		},
		rules: {

		},
	},
]
