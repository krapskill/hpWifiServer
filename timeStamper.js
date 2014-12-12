var util = require('util');


/* **********
 logger winston 
*********** */
var logger = require('./logger.js').logger;
/* **********
file system 
*********** */
var fs = require('fs');


function fileInfo(args) {
	fs.open(args.filePath, 'r', function(status, fd) {
		var stat = fs.fstatSync(fd)
		var fileSize = stat["size"];

		console.log("fileSize of file " + args.filePath + " is " + fileSize)
	});
}

function extracting(status, fd, callback, args) {
	logger.debug("function extracting called with args: " + JSON.stringify(args));

	var nbChannels = args.nbChannels,
		fileSize = (fs.fstatSync(fd))["size"],
		rawSize =fileSize/nbChannels,
		result = [],
		encodingBytes =args.encodingBytes,
		nbSamples = fileSize / (nbChannels * encodingBytes);

	for (var channel = 0; channel < nbChannels; channel++) {
		result[channel] = new Buffer(rawSize);
	}
	
	for (var sample = 0; sample < nbSamples; sample++) {
		for (var channel = 0; channel < nbChannels; channel++) {
			
			var iStart = sample * encodingBytes;
			fs.readSync(fd, result[channel], iStart, encodingBytes, null);
		}
	}
	
	callback(result);
}



function timeStamp(args) {

	var stampDate = args.startingDate,
		frequency = args.frequency,
		chunckSize = args.chunckBytes * args.encodingBytes,
		fileSize = args.buffer.length,
		result = [],
		start = 0,
		n = 0,
		bufferIn = args.buffer;


	while (start != fileSize) {

		if (fileSize < start + chunckSize) {
			chunckSize = fileSize - start;
		}
					
		var bufferData = new Buffer(chunckSize);	
		bufferIn.copy(bufferData,0,start,start+chunckSize);
		
		stampDate = stampDate+Math.round((args.chunckBytes/frequency));
		var bufferStamp = new Buffer(stampDate.toString(16));		
		
		result[n] = new Buffer(bufferData.length + bufferStamp.length);
		
		bufferStamp.copy(result[n],0);
		bufferData.copy(result[n],bufferStamp.length);
		
		start = start + chunckSize;
		
		n++;
	}

	return result;
}

function extract(args, callback) {
	console.log("function extract with args "+JSON.stringify(args));
	fs.open(args.filePath, 'r', function(status, fd) {
		if(status!=null){
			callback(null);
         	return;
		}else{
			extracting(status, fd, callback, args);
		}
	});
}

function bufferizing(status, fd, callback, args) {
	logger.debug("function extracting called with args: " + JSON.stringify(args));

	var fileSize = (fs.fstatSync(fd))["size"];
	var result = new Buffer(fileSize)
	fs.readSync(fd, result);
	
	callback(result);
}

function bufferize(args, callback) {
	console.log("function extract with args "+JSON.stringify(args));
	fs.open(args.filePath, 'r', function(status, fd) {
		if(status!=null){
			callback(null);
         	return;
		}else{
			bufferizing(status, fd, callback, args);
		}
	});
}
exports.bufferize = bufferize;
exports.extract = extract;
exports.timeStamp = timeStamp;
exports.info = fileInfo;
