function require(script) {
    $.ajax({
        url: script,
        dataType: "script",
        async: false,           // <-- This is the key
        success: function () {
            // all good...
        },
        error: function () {
            throw new Error("Could not load script " + script);
        }
    });
}

require('./spin.js')

var connection = new WebSocket('ws://localhost:8126/control');

var nbClients,
	clients=[],
	players=[]; 

function updateList(){
	if(clients.length==0||players.length==0){
		document.getElementById("lecture").style.display = 'none';
	}else{
		document.getElementById("lecture").style.display = 'block';
	}

		var container = document.getElementById("connectedListDiv");
		container.innerHTML="";
		var listData = [];
		
		for(var i=0;i<clients.length;i++){
			listData[i] = 'client '+(i+1);
		}
		
		var listElement = document.createElement("ul");
		
		var numberOfListItems = listData.length;
		
		container.appendChild(listElement);	
	
		for( var i =  0 ; i < numberOfListItems ; ++i){
			var listItem = document.createElement("li");
	    	listItem.innerHTML = listData[i];     
	  		listItem.id = 'listElementClients';


			var comboBoxSound = document.createElement("select");
			comboBoxSound.client = i;

			for(var c=0;c<players.length;c++){
				var option = document.createElement("option");
				option.value = c;
				option.label = players[c].name;
				comboBoxSound.appendChild(option);
			}
		
			comboBoxSound.selectedIndex = clients[i].sound;
		
			comboBoxSound.onchange=function(e){
					clients[e.srcElement.client].sound = e.srcElement.selectedIndex;
					updateList();
					
				askForUpdateSound(e.srcElement.client,e.srcElement.selectedIndex);
			
			};

			listItem.appendChild(comboBoxSound);

			var comboBoxChannel = document.createElement("select");
			
			comboBoxChannel.client = i;
			
			if(players.length>clients[i].sound){
				
				for(var c=0;c<players[clients[i].sound].rawsNumber;c++){
					var option = document.createElement("option");
					option.value = c;
					option.label = "channel "+(c+1);
					comboBoxChannel.appendChild(option);
				}
			
				comboBoxChannel.selectedIndex = clients[i].channel;

			}
			
			comboBoxChannel.onchange=function(e){
				askForUpdateChannel(e.srcElement.client,e.srcElement.selectedIndex)
			};

			listItem.appendChild(comboBoxChannel);

			var button = document.createElement("BUTTON");
			var t = document.createTextNode("localiser");  
			button.appendChild(t);
			button.client=i;                        
			button.addEventListener("click", function(e){
				askForLocalizeClient(e.srcElement.client)
				}, false);
			listItem.appendChild(button);

				if(players.length>0){
					var buttonPlay = document.createElement("BUTTON");
					var t = document.createTextNode("play");  
					buttonPlay.appendChild(t);
					buttonPlay.client=i;
					buttonPlay.cssStyle='.btn';               
					buttonPlay.addEventListener("click", function(e){
						askForStartClient(e.srcElement.client)
						}, false);
					listItem.appendChild(buttonPlay);


						var buttonStop = document.createElement("BUTTON");
						var t = document.createTextNode("stop");  
						buttonStop.appendChild(t);
						buttonStop.client=i;                        
						buttonStop.addEventListener("click", function(e){
							askForStopClient(e.srcElement.client)
							}, false);
						listItem.appendChild(buttonStop);
				}
				


			listElement.appendChild(listItem);
		}
	}

	function updatePlayersList(){
		if(clients.length==0||players.length==0){
			document.getElementById("lecture").style.display = 'none';
		}else{
			document.getElementById("lecture").style.display = 'block';
		}
			var container = document.getElementById("playersListDiv");
			container.innerHTML="";
			var listData = [];

			for(var i=0;i<players.length;i++){
				listData[i] = players[i].name;
			}

			var listElement = document.createElement("ul");

			var numberOfListItems = listData.length;

			container.appendChild(listElement);	
			
			for( var i =  0 ; i < numberOfListItems ; ++i){
				var listItem = document.createElement("li");
		    	listItem.innerHTML = listData[i];       

				var button = document.createElement("BUTTON");
				var t = document.createTextNode("remove");  
				button.appendChild(t);
				button.player=i;                        
				button.addEventListener("click", function(e){
					askForRemovePlayer(e.srcElement.player)
					}, false);
				listItem.appendChild(button);

				listElement.appendChild(listItem);
			}
		}


	connection.onopen = function () {
		console.log("Web socket open");
	};

	connection.onmessage = function (e) {
		console.log("MESSAGE RECEVING : "+e.data);

		var response = JSON.parse(e.data);

		if(response.hasOwnProperty("clients")){
			clients = response.clients;
			if(response.clients.length==0){
				document.getElementById("connectedClientsLabel").innerHTML = " no connected speakers";
			}else if(response.clients.length==1){
				document.getElementById("connectedClientsLabel").innerHTML = "1 connected speaker";
			}else{
				document.getElementById("connectedClientsLabel").innerHTML = response.clients.length+" connected speakers";
			}
			updateList()
		}

		if(response.hasOwnProperty("filePath")){
			document.getElementById("filePath").value=response.filePath;
		}
		if(response.hasOwnProperty("rawsNumber")){
			document.getElementById("rawsNumber").value=response.rawsNumber;
			nbChannels = response.rawsNumber;
			updateList();
		}	

		if(response.hasOwnProperty("startingDelay")){
			document.getElementById("startingDelay").value=response.startingDelay;
		}

		if(response.hasOwnProperty("players")){
			
			players = response.players;
			
			if(response.players.length==0){
				document.getElementById("playersLoadedLabel").innerHTML = " no loaded sounds";
			}else if(response.players.length==1){
				document.getElementById("playersLoadedLabel").innerHTML = "1 loaded sound";
			}else{
				document.getElementById("playersLoadedLabel").innerHTML = response.players.length+" loaded sounds";
			}
			document.getElementById("spin").style.display = 'none';
			document.getElementById("all").style.display = 'block';
			
			updateList();
			updatePlayersList();
		}
		if(response.hasOwnProperty("error")){
			alert(response.error);
			if(clients.length==0||players.length==0){
				document.getElementById("lecture").style.display = 'none';
			}else{
				document.getElementById("lecture").style.display = 'block';
			}
				document.getElementById("spin").style.display = 'none';
				document.getElementById("all").style.display = 'block';
		}

	};

	connection.onclose = function(event) {
		console.log(event);
	};



function askForConnectedClients(){
	var request = {};
	request.request = 'clients';
	connection.send(JSON.stringify(request));
}
function askForStart(){
	var request = {};
	request.request = 'start';
	connection.send(JSON.stringify(request));
}

function askForStop(){
	var request = {};
	request.request = 'stop';
	connection.send(JSON.stringify(request));
}
function askForStopClient(client){
	var request = {};
	request.request = 'stop';
	request.client = client;
	connection.send(JSON.stringify(request));
}	function askForStartClient(client){
		var request = {};
		request.request = 'start';
		request.client = client;
		connection.send(JSON.stringify(request));
	}
function askForLocalizeClient(client){
	var request = {};
	request.request = 'localize';
	request.client = client;
	connection.send(JSON.stringify(request));
}

function askForUpdateChannel(client,channel){
	var request = {};
	request.request = 'update';
	request.client = client;
	request.channel = channel;	
	connection.send(JSON.stringify(request));
}

function askForUpdateSound(client,sound){
	var request = {};
	request.request = 'update';
	request.client = client;
	request.sound = sound;	
	connection.send(JSON.stringify(request));
}

function askForloadFile(){
	var request = {};
	request.request = 'load';
	document.getElementById("spin").style.display = 'block';
	document.getElementById("all").style.display = 'none';
	
	request.filePath=document.getElementById("filePath").value;
	request.rawsNumber=document.getElementById("rawsNumber").value;
	request.name=document.getElementById("soundName").value;
	connection.send(JSON.stringify(request));
}

function askForRemovePlayer(player){
	var request = {};
	request.request = 'remove';
	request.player = player;
	connection.send(JSON.stringify(request));
}

function askForUpdateStartingDelay(){
	var request = {};
	request.request = 'updateStartingDelay';
	request.startingDelay = parseInt(document.getElementById("startingDelay").value);	
	connection.send(JSON.stringify(request));
}

var loadButton = document.getElementById("load");
if (loadButton.addEventListener) loadButton.addEventListener("click",askForloadFile, false);
	
var startButton = document.getElementById("startButton");
if (startButton.addEventListener) startButton.addEventListener("click", askForStart, false);
	
var stopButton = document.getElementById("stopButton");
if (stopButton.addEventListener) stopButton.addEventListener("click", askForStop, false);

var updateStartingDelay = document.getElementById("updateStartingDelay");
if (updateStartingDelay.addEventListener) updateStartingDelay.addEventListener("click", askForUpdateStartingDelay, false);

if(clients.length==0||players.length==0){
	document.getElementById("lecture").style.display = 'none';
}

var opts = {
  lines: 13, // The number of lines to draw
  length: 20, // The length of each line
  width: 20, // The line thickness
  radius: 54, // The radius of the inner circle
  corners: 1, // Corner roundness (0..1)
  rotate: 43, // The rotation offset
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#fff', // #rgb or #rrggbb or array of colors
  speed: 1, // Rounds per second
  trail: 36, // Afterglow percentage
  shadow: true, // Whether to render a shadow
  hwaccel: true, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  top: '50%', // Top position relative to parent
  left: '50%' // Left position relative to parent
};
var target = document.getElementById('spin');
var spinner = new Spinner(opts).spin(target);
document.getElementById("spin").style.display = 'none';
