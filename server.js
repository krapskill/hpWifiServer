/* **********
server.js

Is the file to be launched. 

Responsible for web-socket with raspberries and browser and static http server for browser

when a browser connect the connection is stored in "browser"
when the browser ask for loading sound it is extracted and loaded into "speakers" table
when a new raspberry connect the connection is stored in "clients" table

*********** */



/* **********
principal variables
*********** */
var	pathWSSpeakers = '/speaker',
	pathWSBrowser = '/control',
	WSPort = 8126,
	
	DEFAULT_BYTES_PER_SAMPLE = 2,
	DEFAULT_RAWS_NUMBER = 8,
	DEFAULT_CHUNCK_SIZE = 1024,
	DEFAULT_FREQUENCY = 48000,
	DEFAULT_FILE_PATH = './moving_crossing.raw',
	DEFAULT_STARTING_DELAY=10000,
	
	clients = [],
	players = []
;
	

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
player tool
*********** */
var player = require('./player.js');

/* **********
extracting and timestamping home-made tool
*********** */
var timeStamper = require('./timeStamper.js');

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
load of config file
************/

if (fs.existsSync('./config.json')) {
	console.log("loading onfiguration file exist");
	var file = require('./config.json');
	console.log(file);
	
	if(file.hasOwnProperty('filePath')){
		DEFAULT_FILE_PATH = file.filePath;
	}

	if(file.hasOwnProperty('rawsNumber')){
		DEFAULT_RAWS_NUMBER = file.rawsNumber;	
	}

	if(file.hasOwnProperty('startingDelay')){
		DEFAULT_STARTING_DELAY = file.startingDelay;
	}

	if(file.hasOwnProperty('chunckSize')){
		DEFAULT_CHUNCK_SIZE = file.chunckSize;
	}

	if(file.hasOwnProperty('frequency')){
		DEFAULT_FREQUENCY = file.frequency;
	}

	if(file.hasOwnProperty('bytesPerSample')){
		DEFAULT_BYTES_PER_SAMPLE = file.bytesPerSample;
	}

}


/* **********
USEFULL FUNCTIONS
********** */

//test if string is json
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

//return error to browser
function returnErrorToBrowser(errorStr){
	if(browser){
		browser.send(JSON.stringify({error:errorStr}));
	}
}

//send object to browser
function returnToBrowser(data){
	if(browser){
		browser.send(JSON.stringify(data));
	}
}

//save global configuration into json file
function saveConfig(){
	data = {
		rawsNumber : DEFAULT_RAWS_NUMBER,
		filePath : DEFAULT_FILE_PATH,
		startingDelay : DEFAULT_STARTING_DELAY,
		frequency : DEFAULT_FREQUENCY,
		chunckSize : DEFAULT_CHUNCK_SIZE,
		bytesPerSamples : DEFAULT_BYTES_PER_SAMPLE
	}
	
	var outputFileName = './config.json';
	
	fs.writeFile(outputFileName, JSON.stringify(data), function(err) {
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
	var r = {
		startingDelay : DEFAULT_STARTING_DELAY,
		filePath : DEFAULT_FILE_PATH,
		rawsNumber : DEFAULT_RAWS_NUMBER,
	};
	returnToBrowser(r);
	
	sendPlayers();
	sendClients();
	
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
			if(data.hasOwnProperty('sound')&&data.hasOwnProperty('client')){				
				updateSound(data);
			}
	        break;
	
		// load is load a new file. means extract
		case 'load':
			if(data.hasOwnProperty('filePath')&&data.hasOwnProperty('rawsNumber')){
				if(data.filePath!=""&&data.rawsNumber!=""){
					createPlayer(data);
				}else{
					returnErrorToBrowser('file path and raw number is mendatory');
				}
			}
			break;
			
			break;
		case 'start':
		
			//if browser ask to start specific client
			if(data.hasOwnProperty('client')){
				startClient(data.client);
				
			//else browser ask for start all clients
			}else{
				start();	
			}
			break;
			
		case 'pause':
			pause();	
			break;
		case 'stop':
		
			//if browser ask to stop specific client
			if(data.hasOwnProperty('client')){
				stop(data.client)
				
			//else browser ask for stop all clients
			}else{
				stop();
			}
			break;
			
		//if clients, browser want to know more about connected raspberries
		case 'clients':
			sendClients();
			break;
			
		//if playser, browser ask to know more about loaded sounds
		case 'players':
			sendPlayers();
			break;
			
		// browser ask for remove a sound
		case 'remove':
			if(data.hasOwnProperty('player')){
				players.splice(data.player,1);
				sendPlayers();
			}
			break;
			
		//browser ask for update starting delay
	    case 'updateStartingDelay':
		if(data.hasOwnProperty('startingDelay')){
			DEFAULT_STARTING_DELAY = parseInt(data.startingDelay);
			// we save the value into the json file
			saveConfig();
		}
	default:
	}
}

/* **********
Function for send connected raspberries, the sound and the sound's channel associated to
*********** */
function sendClients(){
	var response = {};
	
		var _clients = [];
		for(var c = 0;c<clients.length;c++){
			_clients[c]={};
			_clients[c].sound = clients[c].sound;
			_clients[c].channel = clients[c].channel;
		}
		response.clients = _clients;
	
	returnToBrowser(response);	
}

/* **********
Function for send to browser the loaded sounds
*********** */
function sendPlayers(){
	var r = {
		players : []
	};
	
	for(var pl=0;pl<players.length;pl++){
		r.players[pl]={
			name:players[pl].name,
			filePath : players[pl].filePath,
			rawsNumber : players[pl].rawsNumber,
			frequency : players[pl].frequency,
			bytesPerSample : players[pl].bytesPerSample,
			chunckSize:players[pl].chunckSize
		};
	}
	returnToBrowser(r);		
}

/* **********
Function for creating a player. it means call the constructor of player and store it into players table
*********** */
function createPlayer(args) {
	players.push(
		player.Player(
		{
			name:args.name,
			filePath:args.filePath,
			frequency:DEFAULT_FREQUENCY,
			chunckSize:DEFAULT_CHUNCK_SIZE,
			bytesPerSample:DEFAULT_BYTES_PER_SAMPLE,
			rawsNumber:args.rawsNumber
		},	
		
		//function called once the sound is loaded (channels extraced)
		function(r){
			logger.debug("callback function of new player process with return : "+JSON.stringify(r));
			
			//if property loaded, the sound is well loaded so we inform the browser
			if(r.loaded){
				sendPlayers();
				
			//else there was a problem and an error is returned to the browser
			}else{
				logger.warn("error while loading file");
				returnErrorToBrowser('error opening the file');
			}
			
			waitkey('q', testCreatePlayer);
			
		})
	);
}
	

/* **********
Functions handeling connections with raspberries
*********** */
webSocketRasp.on('connection', function(ws) {

	//on connection we store an id to identificate each client and send store it into clients table
	ws.id=clients.length;
	ws.channel = 0;
	ws.sound = 0;
	clients.push(ws);
	
	//once it is done we inform the browser
	sendClients();
	
	//if connetion close we remove the raspberry object from the table
	ws.on('close', function(o){
	
		if(clients.length==1){
			clients = [];
		}else{
			clients.splice(ws.id,1);
		}
		sendClients();
	});
});


function updateChannel(args){
	if(args.hasOwnProperty('channel')&&args.hasOwnProperty('client')){
		clients[args.client].channel=args.channel;
	}
}

function updateSound(args){
	if(args.hasOwnProperty('client')&&args.hasOwnProperty('sound')){
		clients[args.client].sound=args.sound;
	}
}

/* **********
Function for stop. stop is realised sending zeros only to client
*********** */
function stop(client){
	var zeros = [];
	
	for(var i=0;i<2061;i++){
		zeros[i]=0;
	}
	
	var buff = new Buffer(zeros);
	
	if(typeof client=='number'){
		clients[client].send(buff,{binary:true,mask:true});
	}else{
		for(var c=0;c<clients.length;c++){
			clients[c].send(buff,{binary:true,mask:true});
		}	
	}

}

/* **********
Function for start specific client 
*********** */
function startClient(client){
	logger.debug("start client");
	
	//just to verify client exists
	if(client<clients.length){
		
		//first ask for timestamp
		var response = players[clients[client].sound].prepareForPlay({
			startingDate : (new Date()).getTime()+DEFAULT_STARTING_DELAY,
			channels:[clients[client].channel]
		});

		//if timeStamping successed
		if(response){
			logger.debug("player "+clients[client].sound+" Timestamped channel "+clients[client].channel);
		}
		var player = players[clients[client].sound];
		var dataTS = player.datasTS[clients[client].channel];
	
		sendOneRawToClient(dataTS,client);	
		
	}else{
		logger.warn("error of start client input "+JSON.stringify(client));
	}
}

function start(){

		
		var channelsToTimeStamp = [];
		
		for(var pl = 0 ; pl<players.length;pl++){
			
			channelsToTimeStamp[pl] = [];
			
			for(var ch = 0;ch<players[pl].rawsNumber;ch++){
				var channelIsUsed = false;
				for(var cl = 0;cl<clients.length;cl++){
					if(clients[cl].sound == pl && clients[cl].channel == ch){
						channelIsUsed = true;
					}
				}
				if(channelIsUsed){
					channelsToTimeStamp[pl].push(ch);
				}
			}
		}
		
		
		for(var pl = 0 ; pl<players.length;pl++){
			
			logger.debug("player "+pl+" has channels used : "+channelsToTimeStamp[pl]);
			
			if(channelsToTimeStamp[pl].length==0){
				logger.debug("player "+pl+" is not used");
			}else{
				var response = players[pl].prepareForPlay({
					startingDate : (new Date()).getTime()+DEFAULT_STARTING_DELAY,
					channels:channelsToTimeStamp[pl]
				});

				if(response){
					logger.debug("player "+pl+" Timestamped")
				}	
			}
		}
		
		for(var client =0;client<clients.length;client++){
				var player = players[clients[client].sound];
				var dataTS = player.datasTS[clients[client].channel];
				sendOneRawToClient(dataTS,client);	
		}
	
}



var beeper = player.Player(
	{
		filePath:'./beep.raw',
		frequency:DEFAULT_FREQUENCY,
		chunckSize:DEFAULT_CHUNCK_SIZE,
		bytesPerSample:DEFAULT_BYTES_PER_SAMPLE,
		rawsNumber:1
},	function(r){
	
	if(r.loaded){
		console.log("beep well loaded");
	}else{
		logger.warn("error while beep file");
	}
});	
	
function sendBeep(client){
		var response = beeper.prepareForPlay({
			startingDate : (new Date()).getTime()+DEFAULT_STARTING_DELAY,
			channels:[0]
		});
		
		if(response){
			logger.debug("beep Timestamped");
			sendOneRawToClient(beeper.datasTS[0],client);
		}
}


function sendOneRawToClient(buffer,client){
		
		var _data = buffer;
		var oneRawLength = _data[0].length;
		var buff = new Buffer(_data.length * oneRawLength)
	
		for (var _raw = 0 ; _raw<_data.length ;_raw ++ ){
			_data[_raw].copy(buff,_raw * oneRawLength);
		}
	
		clients[client].send(buff,{binary:true,mask:true});
	
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

/* **********
SOME TESTS
*********** */
function testBufferize(){
	timeStamper.bufferize(
		{
			filePath : DEFAULT_FILE_PATH,
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
			waitkey('e', testBufferize);
		});
}

function testCreatePlayer(){
	players.push(
		player.Player(
			{
				filePath:DEFAULT_FILE_PATH,
				frequency:DEFAULT_FREQUENCY,
				chunckSize:DEFAULT_CHUNCK_SIZE,
				bytesPerSample:DEFAULT_BYTES_PER_SAMPLE,
				rawsNumber:DEFAULT_RAWS_NUMBER
		},	function(r){
			logger.debug("callback function of new player process with return : "+JSON.stringify(r));
			
			if(r.loaded){
					console.log("file well loaded");

			}else{
				logger.warn("error while loading file");
				returnErrorToBrowser('error opening the file');
			}
			
			waitkey('q', testCreatePlayer);
			
		})
	);
}



function testPlay(){
	var response = players[0].prepareForPlay({
		startingDate : (new Date()).getTime(),
		channels:[0,1,2]
	});
	
	if(response){
		console.log("file Well Timestamped")
	}
	
	var player = players[0];
	var dataTSCh1 = player.datasTS[0];

	sendOneRawToClient(dataTSCh1,0);
	
	waitkey('w', testPlay);

}
waitkey('escape', quit);
waitkey('q', testCreatePlayer);
waitkey('w', testPlay);
waitkey('e', testBufferize);
