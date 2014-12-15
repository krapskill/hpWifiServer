var connection = new WebSocket('ws://localhost:8126/control');
var nbClients,
	clients=[],
	nbChannels; 

function updateList(){

		var container = document.getElementById("connectedListDiv");
		container.innerHTML="";
		var listData = [];
		
		for(var i=0;i<nbClients;i++){
			listData[i] = 'client '+(i+1);
		}
		
		var listElement = document.createElement("ul");
		
		var numberOfListItems = listData.length;
		
		container.appendChild(listElement);	
	
		for( var i =  0 ; i < numberOfListItems ; ++i){
			var listItem = document.createElement("li");
	    	listItem.innerHTML = listData[i];       

			var comboBox = document.createElement("select");
			comboBox.client = i;

			for(var c=0;c<nbChannels;c++){
				var option = document.createElement("option");
				option.value = c;
				option.label = "channel "+c;
				comboBox.appendChild(option);
			}
		
			comboBox.selectedIndex = clients[i].channel;
		
			comboBox.onchange=function(e){
				askForUpdateChannel(e.srcElement.client,e.srcElement.selectedIndex)
			};

			listItem.appendChild(comboBox);

			var button = document.createElement("BUTTON");
			var t = document.createTextNode("localiser");  
			button.appendChild(t);
			button.client=i;                        
			button.addEventListener("click", function(e){
				askForLocalizeClient(e.srcElement.client)
				}, false);
			listItem.appendChild(button);

			listElement.appendChild(listItem);
		}
	}


	connection.onopen = function () {
		askForConnectedClients();
	};

	connection.onmessage = function (e) {
		console.log("MESSAGE RECEVING : "+e.data);

		var response = JSON.parse(e.data);

		if(response.hasOwnProperty("nbClients")){
			nbClients = response.nbClients;
			clients = response.clients;
			if(response.nbClients==0){
				document.getElementById("connectedClientsLabel").innerHTML = " no connected speakers";
			}else if(response.nbClients==1){
				document.getElementById("connectedClientsLabel").innerHTML = "1 connected speaker";
			}else{
				document.getElementById("connectedClientsLabel").innerHTML = response.nbClients+" connected speakers";
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
			
		if(response.hasOwnProperty("loaded")){
			document.getElementById("lecture").style.display = 'block';
			nbChannel=response.nbChannels;
		}
		if(response.hasOwnProperty("error")){
			alert(response.error);
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
	request.startingDelay = document.getElementById("startingDelay").value;
	connection.send(JSON.stringify(request));
}
function askForPause(){
	var request = {};
	request.request = 'pause';
	connection.send(JSON.stringify(request));
}
function askForStop(){
	var request = {};
	request.request = 'stop';
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

function askForloadFile(){
	var request = {};
	request.request = 'load';
	document.getElementById("lecture").style.display = 'none';
	request.filePath=document.getElementById("filePath").value;
	request.rawsNumber=document.getElementById("rawsNumber").value;
	connection.send(JSON.stringify(request));
}

function askForSendData(){
	var request = {};
	request.request = 'send';
	request.raws = 'all'
	connection.send(JSON.stringify(request));
}

function askForSendRaw(){
	var request = {};
	request.request = 'send';
	request.raws = 1
	connection.send(JSON.stringify(request));
}

var loadButton = document.getElementById("load");
if (loadButton.addEventListener) loadButton.addEventListener("click",askForloadFile, false);

var updateButton = document.getElementById("updateButton");
if (updateButton.addEventListener) updateButton.addEventListener("click", askForConnectedClients, false);
	
var startButton = document.getElementById("startButton");
if (startButton.addEventListener) startButton.addEventListener("click", askForStart, false);
	
var stopButton = document.getElementById("stopButton");
if (stopButton.addEventListener) stopButton.addEventListener("click", askForStop, false);

document.getElementById("lecture").style.display = 'none';
