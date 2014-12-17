/* **********
extracting and timestamping home-made tool
*********** */
var timeStamper = require('./timeStamper.js');

/* **********
 logger winston 
*********** */
var logger = require('./logger.js').logger;


/* **********
Constructor
*********** */
function Player(args,callback){
	
	var player = {
		datas : [],
		datasTS : [],
		frequency: args.frequency,
		rawsNumber:args.rawsNumber,
		chunckSize:args.chunckSize,
		bytesPerSample : args.bytesPerSample,
		filePath:args.filePath,
		name:args.name
	};
				

	
	/* **********
	the player know how to prepare, mean how to stampdate
	*********** */
	player.prepareForPlay = function(args){
		logger.debug("prepareForPlay start");
		if(this.datas.length>0){

			var startingDate = args.startingDate

			
			for(var k=0;k<args.channels.length;k++){
				logger.debug("timestamping channel num :"+args.channels[k]);

				player.datasTS[args.channels[k]] = timeStamper.timeStamp({
					buffer:player.datas[args.channels[k]],
					frequency:player.frequency,
					startingDate:startingDate,
					chunckBytes : player.chunckSize,
					encodingBytes : player.bytesPerSample,
				});
				
				logger.debug("timestamping channel num :"+args.channels[k]+ " finished"+" and length is "+player.datasTS[args.channels[k]].length);

			}
			return true;
		}else{
			return false;
		}

	}

	console.log("player is "+JSON.stringify(player));
	
	timeStamper.extract(
		{
			nbChannels:player.rawsNumber,
			filePath : player.filePath,
			encodingBytes : player.bytesPerSample,
		},

		function(r){
			logger.debug("callback function of extraction process");

			if(r==null){
				logger.warn("error while loading file");
					callback({
						loaded : false
					});
			}else{
				
				player.datas = r;
				
				callback({
					loaded : true,
					length : player.datas[0].length,
					rawsNumber : player.rawsNumber,
					filePath : player.filePath
				});
			}
		}
	);	
	
	return player;
}

module.exports.Player = Player;

	
	