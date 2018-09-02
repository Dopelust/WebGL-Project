var chatroom = document.getElementById("chatroom");
var online_list = document.getElementById("online_list");
var input = document.getElementById("chat");

var socket = io();
var username = "";

input.addEventListener("keyup", function(event) 
{
	event.preventDefault();

	if (event.keyCode == 13)
		document.getElementById("send").click();
});

function SendChat()
{
	if (input.value.length > 0)
	{
		if (username.length > 0)
		{						
			var msg = {user: username, value: input.value};
			socket.emit('chat message', msg);
			OnChat(username, input.value);
		}
		else
		{
			username = input.value;
			socket.emit('join chat', username);
			chatroom.innerHTML = '';
			OnJoin(username);
		}
		
		input.value = '';
	}
	
	chatroom.scrollTop = chatroom.scrollHeight;
}

function OnChat(user, msg)
{
	if (username.length > 0)
		chatroom.innerHTML += "<b>" + user + ": </b> " + msg + "<br>";
}
socket.on('chat message', function(msg){
	OnChat(msg.user, msg.value); });

function OnJoin(msg)
{
	if (username.length > 0)
	{
		chatroom.innerHTML += '<b>' + msg + '</b> joined the channel.<br>';
		online_list.innerHTML += '<b>' + msg + '</b><br>';
	}
}
socket.on('join chat', function(msg){
	OnJoin(msg); });

socket.on('leave chat', function(msg)
{
	if (username.length > 0)
	{
		chatroom.innerHTML += '<b>' + msg + '</b> left the channel.<br>';
		online_list.innerHTML = online_list.innerHTML.replace('<b>' + msg + '</b><br>', '');
	}
});

socket.on('userlist', function(userlist)
{
	for (var i = 0; i < userlist.length; ++i)
	{
		online_list.innerHTML += '<b>' + userlist[i] + '</b><br>';
	}
});