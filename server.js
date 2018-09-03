var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use('/js', express.static('js'));
app.use('/js/home',express.static('js/home'));
app.use('/js/reversi',express.static('js/reversi'));
app.use('/shader', express.static('shader'));
app.use('/shader/reversi', express.static('shader/reversi'));
app.use('/img', express.static('img'));
app.use('/json', express.static('json'));


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
app.get('/reversi', function(req, res){
  res.sendFile(__dirname + '/reversi/index.html');
});

var userlist = new Array();

io.on('connection', function(socket)
{
	var username = "";
	console.log('a user connected');

	socket.on('join chat', function(msg){
		console.log('user joined chat');
		socket.broadcast.emit('join chat', msg);
		socket.emit('userlist', userlist);
		username = msg;
		userlist.push(username);
	});
  
	socket.on('create room', function(msg){
		console.log('user created room');
		socket.join(msg.room.toString());
		io.emit('create room', msg);
	});
	socket.on('join room', function(msg){
		console.log('user joined room');
		socket.join(msg.room.toString());
		io.emit('join room', msg);
	});
	socket.on('leave room', function(msg){
		console.log('user left room');
		socket.leave(msg.room.toString());
		io.emit('leave room', msg);
	});
	
	socket.on('reversi move', function(msg){
		console.log('user reversi move');
		socket.broadcast.to(msg.room.toString()).emit('reversi move', msg);
	});
	
	socket.on('chat message', function(msg){
		console.log('message: ' + msg);
		socket.broadcast.emit('chat message', msg);
	});
  
	socket.on('disconnect', function(){
		console.log('user disconnected');
		if (username.length > 0)
		{
			io.emit('leave chat', username);
			userlist.splice(userlist.indexOf(username), 1);
		}	
	});
});

http.listen(8000, function(){
  console.log('listening on *:8000');
});