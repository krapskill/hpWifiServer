var isMacintosh = true,
	pathWSSpeakers = '/speaker',
	pathWSBrowser = '/control',
	WSPort = 8126,
	testExtractingFilePath = './moving_crossing.raw',
	nbChannelExtractingTestFile = 8,
	testBufferizeingFilePath = './beep.raw',
	bytesPerSample = 2,
	chunckSize = 1024,
	frequency = 48000;
	
var clients = [],
	datas = [],
	datasTS = [];
	

/* **********
 logger winston 
*********** */
var logger = require('./logger.js').logger;


/* **********
 keyboard handler
*********** */
var waitkey = require('waitkey');


/* **********
File reading
*********** */
fs = require('fs');


/* **********
extracting and timestamping tool
*********** */
var timeStamper = require('./timeStamper.js');




if(isMacintosh){
	
	/* **********
	A speaker , usefull function is play which take a buffer as entry
	*********** */
	var Speaker = require('speaker');

	// Create the Speaker instance
	var speaker = new Speaker({
  		channels: 1,          // 2 channels
  		bitDepth: bytesPerSample*8,         // 16-bit samples
  		sampleRate: frequency     // 44,100 Hz sample rate
	});

	// PCM data from stdin gets piped into the speaker
	function play(buff){
		console.log("play of length : "+buff.length);
		var stream = require("stream");

		// Initiate the source
		var bufferStream = new stream.Transform();
		bufferStream.push(buff);

		// Pipe it to something else 
		bufferStream.pipe(speaker)
	
	}
}

/* **********
Network communication
*********** */
/* **********
with raspberries*/
var WebSocketServer = require('ws').Server;
var http = require('http');
var server = http.createServer();
var webSocketRasp = new WebSocketServer({server: server, path:pathWSSpeakers});

/* **********
with browser*/
var browser;
var webSocketControl = new WebSocketServer({server: server, path: pathWSBrowser});
server.listen(WSPort);

var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(8080);


/* **********
USEFULL FUNCTIONS
*********** */

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function returnErrorToBrowser(errorStr){
	if(browser){
		browser.send(JSON.stringify({error:errorStr}));
	}
}

function returnToBrowser(data){
	if(browser){
		browser.send(JSON.stringify(data));
	}
}

function saveConfig(data){
	
	var outputFileName = './config.json';
	fs.writeFile(outputFileName, JSON.stringify(data, null, 4), function(err) {
	    if(err) {
			logger.warn(err);
	    } else {
	      logger.info("JSON saved to " + outputFileName);
	    }
	});
}

/* **********
Functions handeling orders et requests from browser client
*********** */


webSocketControl.on('connection', function(ws) {
	// when a browser connect we save it to be able to send data whenever we need to
	browser=ws;
	
	// we also send the last info we had
	var r = {};
	r.nbClients = clients.length;
	r.filePath = filePath;
	r.rawsNumber = rawsNumber;
	r.clients = [];
	for(var cl=0;cl<clients.length;cl++){
		r.clients[cl]={};
		r.clients[cl].channel=clients[cl].channel;
	}
	if(datas.length>0 && datas[0].length>0){
		r.loaded = true;
		r.length = datas[0].length;
	}
	returnToBrowser(r);
	
	//On message, browser mus send json data and has property request to be processed
	ws.on('message',function(data,flags){	
		if(IsJsonString(data)){			
			data = JSON.parse(data);
			if(data.hasOwnProperty('request')){
				data.ws=ws;
				handleBrowserRequests(data);
			}	
		}
	});
});

//When browser send request , this function parse the data and process as needed
function handleBrowserRequests(data){
	var request = data.request
	switch(request) {
		
		//if localize request just send a beep to the concerned client
	    case 'localize':
	if(data.hasOwnProperty('client')){
		sendBeep(data.client);
	}
	        break;
	
		//update means choose a new channel to the concerned client
	    case 'update':
			if(data.hasOwnProperty('channel')&&data.hasOwnProperty('client')){				
				updateChannel(data);
			}
	        break;
	
		// load is load a new file. means extract
		case 'load':
			if(data.hasOwnProperty('filePath')&&data.hasOwnProperty('rawsNumber')){
				if(data.filePath!=""&&data.rawsNumber!=""){
					filePath = data.filePath;
					rawsNumber = data.rawsNumber;
					loadFile(data.filePath,data.rawsNumber);
				}else{
					returnErrorToBrowser('file path and raw number is mendatory');
				}
			}
			break;
			
		// start stop
		break;
		case 'start':
			start();	
		break;
		case 'pause':
			pause();	
		break;
		case 'stop':
			stop();	
		break;
		case 'clients':
			sendClients();
		break;
	    default:
	}
}


/* **********
Functions handeling connections with raspberries
*********** */

webSocketRasp.on('connection', function(ws) {

	ws.id=clients.length;
	console.log("this is client "+ws.id);
	clients.push(ws);
	sendClients();
	
	ws.on('close', function(o){
		console.log("remove of client "+ws.id);
		clients.splice(ws.id,1);
		sendClients();
	});
});


function broadcast(message){
	if(clients.length>0){
		logger.debug("a message is broadcasted to "+clients.length+" clients");	
		var toSend;
		if(message.hasOwnProperty('data')&&message.hasOwnProperty('binary')){
			if(message.binary){
				toSend = message.data,{binary:true,mask:true};
			}else{
				toSend = message.data
			}
		}else{
			toSend = message;
		}
		
		for(var i_client=0;i_client<clients.length;i_client++){	
			clients[i_client].send(toSend);
		}

	}else{
		logger.debug("nothing broadcasted cause no clients");
	}
}


if (fs.existsSync('./config.json')) {
	
	console.log("file exist");
	var file = require('./config.json');
	
	filePath = file.filePath;
	rawsNumber = file.rawsNumber;
}

function updateChannel(args){

		clients[args.client].channel=args.channel;

}

function sendClients(){
	var response = {};
	
		response.nbClients = clients.length;
		var _clients = [];
		for(var c = 0;c<clients.length;c++){
			_clients[c]={};
			_clients[c].channel = clients[c].channel;
		}
		response.clients = _clients;
	
	returnToBrowser(response);	
}


function sendAllFileToAllClients(){
	for(var _cl = 0 ; _cl<clients.length ; _cl++){
		var _data = datasTS[clients[_cl].channel];
		var oneRawLength = _data[0].length;
		var buff = new Buffer(_data.length * oneRawLength)
		for (var _raw = 0 ; _raw<_data.length ;_raw ++ ){
			_data[_raw].copy(buff,_raw * oneRawLength);
		}
		clients[_cl].send(buff,{binary:true,mask:true});
	}
}
/* **********
TIMESTAMP INITIALISATION
*********** */
waitkey('l', loadT);

function loadT(){
	loadFile(testExtractingFilePath,8);
	waitkey('l', loadT);
	
}

function loadFile(filePath,rawsNumber){
	
	timeStamper.extract(
		{
			nbChannels:rawsNumber,
			filePath : filePath,
			encodingBytes : bytesPerSample,
		},
		
		function(r){
			logger.debug("callback function of extraction process");
			
			if(r==null){
				logger.warn("error while loading file");
				returnErrorToBrowser('error opening the file');
			}else{
				saveConfig({filePath:filePath,rawsNumber:rawsNumber});
				datas = r;
				
				var dataToBrowser = {
					loaded : true,
					length : datas[0].length,
					nbChannels : rawsNumber 
				};
				
				returnToBrowser(dataToBrowser);
				
			}
		}
	);

}


function stop(){
	broadcast({data:'stop',binary:false});
}

function pause(){
	stop();
}

function sendBufferToClient(args){
	clients[args.client].send(args.buffer,{binary:true,mask:true});
}

function sendBeep(client){
	console.log("function send beep to client "+client);
	timeStamper.bufferize(
		{
			filePath : './beep.raw',
		},
		
		function(r){
			logger.debug("callback function of send beep");
			
			if(r==null){
				logger.warn("error while loading file");
				returnErrorToBrowser('error opening the file');
			}else{
				var startingDate = (new Date()).getTime() + 10000;
				logger.debug("sound must start at "+startingDate.toString());
				var buffer = timeStamper.timeStamp({
					buffer:r,
					frequency:frequency,
					startingDate:startingDate,
					chunckBytes : chunckSize,
					encodingBytes : bytesPerSample,
				});
				sendBufferToClient({client:client,buffer:buffer});
			}
		});
}

function start(){
	logger.debug("start");
	
	if(datas.length>0){
	
		var startingDate = (new Date()).getTime() + 10000;
		logger.debug("sound must start at "+startingDate.toString());
	
		for(var k=0;k<datas.length;k++){
		
			datasTS[k] = timeStamper.timeStamp({
				buffer:datas[k],
				frequency:frequency,
				startingDate:startingDate,
				chunckBytes : chunckSize,
				encodingBytes : bytesPerSample,
			});
		}
	
		sendAllFileToAllClients();
	}

	waitkey('space', start);

}


/* **********
Functions for command line interface
*********** */
function getClients(){
	console.log(clients.length+" connected clients");
	waitkey('c', getClients);
	
}	
waitkey('c', getClients);

/* **********
QUIT APPLICATION
*********** */

function quit(){
	process.exit(1);
}

function testExtract(){
	
	timeStamper.extract(
		{
			nbChannels:nbChannelExtractingTestFile,
			filePath : testExtractingFilePath,
			encodingBytes : bytesPerSample,
		},
		
		function(r){
			logger.debug("callback function of extraction process");
			
			if(r==null){
				logger.warn("error while loading file");
				returnErrorToBrowser('error opening the file');
			}else{
				logger.debug("extracting test succeed and extracts "+ r.length +" channels of "+r[0].length+" length");
				if(isMacintosh){
					play(r[2]);	
				}
			}
			waitkey('e', testExtract);
		}
	);
}

function testBufferize(){
	timeStamper.bufferize(
		{
			filePath : testBufferizeingFilePath,
		},
		
		function(r){
			logger.debug("callback function of send beep");
			
			if(r==null){
				logger.warn("error while loading file");
				returnErrorToBrowser('error opening the file');
			}else{
				logger.debug("bufferizing test succed");
				if(isMacintosh){
					play(r);
				}
			}
			waitkey('b', testBufferize);
		});
}

waitkey('escape', quit);
waitkey('e', testExtract);
waitkey('b', testBufferize);