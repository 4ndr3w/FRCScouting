var app = require("express")()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , fs = require('fs');

  server.listen(8080);
  
  function reqHandler(req,res)
  {
	  fs.readFile("frontend/scout.html", function(err, data)
	  {
	  	res.writeHead(200);
	  	res.end(data);
	  });
  }
  
var scouterPool = new Array();

var matchList = new Array();

function emptyTeamDataObject()
{
	return {
		team: 0,
		match: 0,
		auto: [0,0,0],
		tele: [0,0,0],
		climb: 0,
		comments: "",
		blank: true
	};
}

function teamWraper(matchInfo)
{
	return {
		assignedScouter: undefined,
		matchData: matchInfo
	}
}

function Match(number, r1,r2,r3,b1,b2,b3)
{
	this.number = number;
	this.red = [teamWraper(emptyTeamDataObject()),teamWraper(emptyTeamDataObject()),teamWraper(emptyTeamDataObject())];
	this.blue = [teamWraper(emptyTeamDataObject()),teamWraper(emptyTeamDataObject()),teamWraper(emptyTeamDataObject())];
	
	this.red[0].matchData.team = r1;
	this.red[1].matchData.team = r2;
	this.red[2].matchData.team = r3;
	
	this.blue[0].matchData.team = b1;
	this.blue[1].matchData.team = b2;
	this.blue[2].matchData.team = b3;
	
	for ( var i = 0; i < 3; i++ )
	{
		this.red[i].matchData.match = number;
		this.blue[i].matchData.match = number;
	}
	
	this.numScouters = 0;
	
	this.assignScouter = function(scouterSocket)
	{
		for ( var i = 0; i < 3; i++ )
		{
			if ( this.red[i].assignedScouter == undefined && this.red[i].matchData.blank )
			{
				this.red[i].assignedScouter = scouterSocket;
				
				scouterSocket.emit("assignScouting", this.red[i].matchData);
				
				var thisPtr = this;
				this.red[i].assignedScouter.onDisconnect = function()
				{
					var tmpIndex = i;
					thisPtr.red[tmpIndex].assignedScouter = undefined;
					thisPtr.numScouters--;
				}
				
				this.numScouters++;
				return;
			}
		}
		
		for ( var i = 0; i < 3; i++ )
		{
			if ( this.blue[i].assignedScouter == undefined && this.red[i].matchData.blank )
			{
				scouterSocket.emit("assignScouting", this.blue[i].matchData);
				this.blue[i].assignedScouter = scouterSocket;
				var thisPtr = this;
				this.blue[i].assignedScouter.onDisconnect = function()
				{
					var tmpIndex = i;
					thisPtr.blue[tmpIndex].assignedScouter = undefined;
					thisPtr.numScouters--;
				}
				this.numScouters++;
				return;
			}
		}
	}
	
	this.isComplete = function()
	{
		var complete = true;
		for ( var i = 0; i < 3; i++ )
		{
			if ( this.red[i].matchData.blank || this.blue[i].matchData.blank )
				complete = false;
		}
		return complete;
	}
	
	this.needsScouters = function()
	{
		return this.numScouters < 6;
	}
	
	return this;
}

function getNextOpenMatch()
{
	for ( var i = 0; i < matchList.length; i++ )
	{
		if ( !matchList[i].isComplete() && matchList[i].needsScouters() )
			return matchList[i];
	}
	return undefined;
	console.log("here");
}

matchList.push(new Match(22, 103, 225, 987, 111, 222, 321));

function assignScouterToMatchAndTeam(socket)
{
	var match = undefined;
	if ( (match = getNextOpenMatch()) != undefined )
	{
		match.assignScouter(socket);
	}
}


io.sockets.on('connection', function (socket) {
	assignScouterToMatchAndTeam(socket);
	
	socket.on("commitScoutingData", function(data)
	{
		fs.mkdir("teamData/"+data.team);	
		fs.writeFile("teamData/"+data.team+"/"+data.match, JSON.stringify(data), function(err) {});		
		console.log(data);
		assignScouterToMatchAndTeam(socket);11
	});
});


app.get("/", function (req,res)
{
	fs.readFile("frontend/scout.html", function(err,data) {
		res.set('Content-Type', 'text/html');
		res.send(200, data);
	});
});

app.get("/api/teamMatches", function(req,res)
{
	teamID = req.param("id");
	fs.readdir("teamData/"+teamID, function(err, files)
	{
		if ( err )
			res.json(null);
		else
		{
			data = new Array();
			for ( var i = 0; i < files.length; i++ )
			{
				try{
					data.push(JSON.parse(fs.readFileSync("teamData/"+teamID+"/"+files[i]).toString()));
				} catch (e) {}
			}
			res.json(data);
		}
	});	
});


app.get("/api/matchInfo", function(req,res)
{
	teamID = req.param("id");
	fs.readdir("teamData/"+teamID, function(err, files)
	{
		if ( err )
			res.json(null);
		else
			res.json(files);
	});	
});



