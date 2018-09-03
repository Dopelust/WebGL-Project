var chatroom = document.getElementById("chatroom");
var online_list = document.getElementById("online_list");
var input = document.getElementById("chat");

var socket = io();

var roomNo = 1;
var username = "";
var opponent = "";

input.addEventListener("keyup", function(event) 
{
	event.preventDefault();

	if (event.keyCode == 13)
		document.getElementById("send").click();
});
function GetRoomButtonHTML(no, oppo)
{
	return "<button class=\"" + no.toString() + "\"onclick=\"JoinRoom(" + no.toString() + ", '" + oppo + "')\"><b>Room " + no.toString() + "<b></button>";
}
function LockRoomInChat(room)
{
	var room_button = chatroom.getElementsByClassName(room.toString());

	for (var i = 0; i < room_button.length; ++i)
		room_button[i].disabled = true;
}

function StartCoop()
{
	if (confirm("Start New Local Co-Op match? You will leave the current room."))
	{
		LeaveRoom();
		document.getElementById("room_title").innerHTML = "Room 1: Player 1(Black) VS Player 2(White)";		
		document.getElementById("invite_room").disabled = true;
		ResetBoard();
		ChangeBoardState(gameState.LOCAL);
	}
}
function StartComputer()
{
	if (confirm("Start New Computer match? You will leave the current Room."))
	{
		LeaveRoom();
		document.getElementById("room_title").innerHTML = "Room 1: YOU(Black) VS Computer(White)";
		document.getElementById("invite_room").disabled = true;
		ResetBoard();
		ChangeBoardState(gameState.COMPUTER);
	}
}
function LeaveRoom()
{
	if (roomNo > 1)
	{
		socket.emit('leave room', {user: username, room: roomNo});
		
		roomNo = 1;
		opponent = "";
	}
}
function JoinRoom(no, oppo)
{
	if (roomNo == 1)
	{
		roomNo = no;
		opponent = oppo;
		
		document.getElementById("room_title").innerHTML = "Room " + roomNo.toString() + ": Waiting for opponent..."
		document.getElementById("invite_room").disabled = true;

		socket.emit('join room', {player1:oppo, player2: username, room: no});
	}
	else if (roomNo == no)
	{
		alert("Already in Room " + no.toString() + '.');
	}
	else
	{
		alert("Already in a room.");
	}
}
function CreateNewRoom()
{
	if (roomNo == 1 && username.length > 0)
	{
		roomNo =  Math.max(Math.floor(Math.random() * 1000), 2);
		document.getElementById("room_title").innerHTML = "Room " + roomNo.toString() + ": Waiting for opponent..."
		document.getElementById("invite_room").disabled = false;

		ResetBoard();
		ChangeBoardState(gameState.COMPUTER);

		socket.emit('create room', {player1: username, plyaer2:"", room: roomNo});
	}
	else if (username.length == 0)
		alert("Enter your username in chat first!");
	else
		alert("Already in a room!");
}
function InviteToRoom()
{
	if (username.length > 0)
	{
		if (roomNo == 1)
			alert("Create a room first!");
		else
		{			
			socket.emit('chat message', {user: username, value: GetRoomButtonHTML(roomNo, username)});
			OnChat(username, GetRoomButtonHTML(roomNo, username));
		}
	}
	else
		alert("Enter your username in chat first!");
}
function SendChat()
{
	if (input.value.length > 0)
	{
		if (username.length > 0)
		{						
			socket.emit('chat message', {user: username, value: input.value});
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

socket.on('leave room', function(msg)
{
	if (username.length > 0)
	{	
		chatroom.innerHTML += "<b>" + msg.user + "</b> has left <b>Room " + msg.room.toString() + ".<b><br>";
		LockRoomInChat(msg.room);
	}
});
socket.on('create room', function(msg)
{
	if (username.length > 0)
	{	
		chatroom.innerHTML += "<b>" + msg.player1 + "</b> created " + GetRoomButtonHTML(msg.room, msg.player1) + "<br>";
	}
});
socket.on('join room', function(msg)
{
	if (username.length > 0)
	{	
		chatroom.innerHTML += "<b>" + msg.player2 + "</b> joined <b>Room " + msg.room.toString() + ".<b><br>";
		
		if (roomNo == msg.room)
		{
			if (username == msg.player1)
			{
				opponent = msg.player2;
				document.getElementById("room_title").innerHTML = "Room " + roomNo.toString() + ": YOU(Black) VS " + opponent + "(White)";
				document.getElementById("invite_room").disabled = true;
				ResetBoard(false);
				ChangeBoardState(gameState.ONLINE);
			}
			else if (username == msg.player2)
			{
				opponent = msg.player1;
				document.getElementById("room_title").innerHTML = "Room " + roomNo.toString() + ": YOU(White) VS " + opponent + "(Black)";
				document.getElementById("invite_room").disabled = true;
				ResetBoard(true);
				ChangeBoardState(gameState.ONLINE);
			}
		}
		else
		{
			roomNo = 1;
			opponent = "";
		}
		
		LockRoomInChat(msg.room);
	}
});

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

socket.on('reversi move', function(msg)
{
	if (roomNo == msg.room)
	{
		PlaceChecker(msg.x, msg.y);
	}
});
	
socket.on('userlist', function(userlist)
{
	for (var i = 0; i < userlist.length; ++i)
	{
		online_list.innerHTML += '<b>' + userlist[i] + '</b><br>';
	}
});