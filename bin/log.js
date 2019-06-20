const log4js = require('log4js')

const aLayout = {
	type: 'pattern',
	pattern: '[%d{yyyy-MM-dd hh.mm.ss.SSS}] [%p] - %m%n',
}

module.exports = {
	getLogger(logDir) {
		log4js.configure({
			appenders: {
				"usual": {type: 'dateFile', filename: `${logDir}/info.log`, pattern: '.yyyy-MM-dd', daysToKeep: 30, keepFileExt: true, layout: aLayout},
				"normal": {type: 'logLevelFilter', appender: 'usual', level: 'trace'},
				"emergencies": {type: 'dateFile', filename: `${logDir}/error.log`, pattern: '.yyyy-MM-dd', daysToKeep: 30, keepFileExt: true, layout: aLayout},
				"error": {type: 'logLevelFilter', appender: 'emergencies', level: 'error'},
				"console.log": {type: 'console', layout: {type: 'pattern', pattern: '%[%m%]'}},
				"console": {type: 'logLevelFilter', appender: 'console.log', level: 'warn'},
			},
			categories: {default: {appenders: ['normal', 'error', 'console'], level: 'trace'}},
		})
		return log4js.getLogger()
	},
}
