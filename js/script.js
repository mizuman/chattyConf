// SkyWay API Key for localhost
// var APIKEY = '6165842a-5c0d-11e3-b514-75d3313b9d05';
// SkyWay API Key for mizuman.github.io
var APIKEY = '41c2d0fa-97b8-11e3-9d13-25b648c02544';

// ユーザーリスト
var userList = [];	// オンラインのpeer id
var chatList = [];	// 接続中のpeer id	

// ユーザ名をランダムに生成
var namePrefix = 'chatty-';
var userName = namePrefix + 'user' + Math.floor(Math.random() * 100);

// PeerJSオブジェクトを生成
// var peer = new Peer(userName,{ key: APIKEY});
var peer;

window.onload = function onLoad() {

	var param = GetQueryString();
	if(param && param.roomid) {
		namePrefix = param.roomid + '-';
		userName = namePrefix + 'user' + Math.floor(Math.random() * 100);
		if(param.username) {
			userName = namePrefix + param.username;
		}
	}

	peer = new Peer(userName,{ key: APIKEY});

	// PeerIDを生成
	peer.on('open', function(){
		$('#my-id').text(peer.id.slice(namePrefix.length));
		getUserList();
		connectAll();
	});

	peer.on('connection', function(conn){
		dataChannelEvent(conn);
	});

	peer.on('error', function(err){
		alert(err);
	});
};


// PeerJS data connection object
var peerConn = [];

function GetQueryString() {
	if (1 < document.location.search.length) {
		// 最初の1文字 (?記号) を除いた文字列を取得する
		var query = document.location.search.substring(1);

		// クエリの区切り記号 (&) で文字列を配列に分割する
		var parameters = query.split('&');

		var result = {};
		for (var i = 0; i < parameters.length; i++) {
			// パラメータ名とパラメータ値に分割する
			var element = parameters[i].split('=');

			var paramName = decodeURIComponent(element[0]);
			var paramValue = decodeURIComponent(element[1]).replace(/\u002f/g,'');

			// パラメータ名をキーとして連想配列に追加する
			result[paramName] = decodeURIComponent(paramValue);
		}
		return result;
	}
	return null;
}

function getUserList () {
	//ユーザリストを取得
	$.get('https://skyway.io/active/list/'+APIKEY,
		function(list){
			userList=[];
			// $('#contactlist').innerHTML="";
			document.getElementById('contactlist').options.length=0;
			for(var cnt = 0;cnt < list.length;cnt++){
				if($.inArray(list[cnt],userList)<0 && list[cnt] != peer.id && list[cnt].search(namePrefix) === 0){
					userList.push(list[cnt]);
					$('#contactlist').append($('<option>', {"value":list[cnt],"text":list[cnt].slice(namePrefix.length)}));
				}
			}
		}
	);
}

function connectAll() {
	$.get('https://skyway.io/active/list/'+APIKEY,
		function(list){
			for(var cnt = 0;cnt < list.length;cnt++){
				if( list[cnt] != peer.id && list[cnt].search(namePrefix) === 0){
					connect(list[cnt]);
				}
			}
		}
	);
}

function connect(peerid){

	if(chatList.indexOf(peerid) < 0) {
		// var conn = peer.connect( $('#contactlist').val(), {"serialization": "json"} );
		var conn = peer.connect( peerid, {"serialization": "json"} );
		dataChannelEvent(conn);
	}
}

function dataChannelEvent(conn){
	peerConn[peerConn.length] = conn;
	$('#their-id').append(conn.peer.slice(namePrefix.length));
	// console.log(conn);

	addHistory({type: 'info', message: conn.peer.slice(namePrefix.length) +' is online'});

	chatList[chatList.length] = conn.peer;

	peerConn[peerConn.length - 1].on('data', function(data){
		
		if(data.type === 'chat') {
			addHistory(data);
		}

	});
}

function addHistory(data) {

	// console.log("receiveMsg : ",data);
	var item = data.message;

	if(data.type==='chat') {
		item = '<tr><td align="right"><b>' + data.from.slice(namePrefix.length) + '</b> : </td><td>' + data.message + '</td></tr>';
	}

	if(data.type==='info') {
		item = '<tr class="info"><td align="right"><b>information</b> : </td><td>' + data.message + '</td></tr>';
	}

	$('#history table').prepend(item);		

}

function sendMsg(type, message) {

	var data = {
		type: type,
		message: message,
		from: userName
	};

	// console.log("sendMsg : ",data);

	if(type==='chat') {
		addHistory(data);
	}

	for(var i = 0; i < peerConn.length; i++){
		peerConn[i].send(data);
	}
}

function createPrivateRoom() {

	var roomid = $('#roomid').val();
	var username = $('#username').val();

	if(!roomid) roomid = 'room' + Math.floor(Math.random() * 10000);
	var url = document.location.origin + '?roomid=' + roomid;
	if(username) url += '&username=' + username;
	document.location = url;
}

$(function(){
	$('#make-connection').click(function(event) {
		connect($('#contactlist').val());
	});

	// send message
	$('#send-message').click(function(event) {
		sendMsg('chat', $('#message').val());
		$('#message').val('');

	});
	$('#message').keypress( function ( e ) {
		if ( e.which == 13 ) {
			sendMsg('chat', $('#message').val());
			$('#message').val('');
		}
	});

	// create private room
	$('#make-room').click(function(event) {
		createPrivateRoom();
	});
	$('#roomid').keypress( function ( e ) {
		if ( e.which == 13 ) {
			createPrivateRoom();
		}
	});
	$('#username').keypress( function ( e ) {
		if ( e.which == 13 ) {
			createPrivateRoom();
		}
	});

    setInterval(getUserList, 2000);

})