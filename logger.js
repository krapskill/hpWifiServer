/* **********
 logger winston 
*********** */
var winston = require('winston');

var loggerLevels = {
	levels:{
		debug:0,
		info:1,
		warn:2
	},
	colors:{
		debug:'blue',
		info:'green',
		warn:'red'
	}
};

var logger = new winston.Logger({
	levels:loggerLevels.levels,
	transports: [new winston.transports.Console({
	            level: 'debug',
	            handleExceptions: true,
	            json: false,
	            colorize: true
	        })]
});

exports.logger=logger;