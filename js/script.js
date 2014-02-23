// SkyWay API Key for localhost
// var APIKEY = '6165842a-5c0d-11e3-b514-75d3313b9d05';
// SkyWay API Key for mizuman.github.io
var APIKEY = '41c2d0fa-97b8-11e3-9d13-25b648c02544';

// Compatibility
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
// window.AudioContext = window.AudioContext || window.webkitAudioContext;

// ユーザーリスト
var userList = [];	// オンラインのpeer id
var chatList = [];	// 接続中のpeer id

//Callオブジェクト
var existingCall = [];
window.remoteStream = [];

// ユーザ名をランダムに生成
var namePrefix = 'chatty-';
var userName = namePrefix + 'user' + Math.floor(Math.random() * 100);

var html_minutes = document.getElementById('html-minutes');
var markdown_minutes = document.getElementById('demoStringInput');


// PeerJSオブジェクトを生成
// var peer = new Peer(userName,{ key: APIKEY});
var peer;

window.onload = function onLoad() {

	// メディアストリームを取得する
	navigator.getUserMedia({audio: true, video: true}, function(stream){
		// $('#my-video').prop('src', URL.createObjectURL(stream));
		addVideo(stream,userName);
		window.localStream = stream;
	}, function(){
		// getUserMedia失敗時の処理
	});

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

	// 相手からのコールを受信したら自身のメディアストリームをセットして返答
	peer.on('call', function(call){
		call.answer(window.localStream);
		mediaChannelEvent(call);
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

function addVideo(stream,id) {
	var item = '<div class="userarea"><video id="videoid-' +  id.slice(namePrefix.length) + '" src="' + URL.createObjectURL(stream) + '" autoplay></video><span>' + id.slice(namePrefix.length) + '</span><div>';

	$("#video-listener").append(item);
}

function mediaChannelEvent(call) {



	// すでに接続中の場合はクローズする
	// if (existingCall) {
	// 	existingCall.close();
	// }

	// Callオブジェクトを保存
	existingCall[existingCall.length] = call;

	// 相手からのメディアストリームを待ち受ける
	existingCall[existingCall.length - 1].on('stream', function(stream){
		// $('#their-video').prop('src', URL.createObjectURL(stream));
		addVideo(stream,call.peer);
		remoteStream[remoteStream.length] = stream;
	});

	call.on('close', function(){

	});
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

	// 相手に接続
	$('#make-call').click(function(){
		var call = peer.call($('#contactlist').val(), window.localStream);
		mediaChannelEvent(call);
	});

	// 切断
	$('#end-call').click(function(){
		existingCall.close();
	});

	// send message
	$('#send-message').click(function(event) {
		sendMsg('chat', $('#message').val());
		$('#message').val('');

	});

	// var html_minutes = document.getElementById('html-minutes');
	// var markdown_minutes = document.getElementById('demoStringInput');

	$('#message').keypress( function ( e ) {
		if ( e.which == 13 ) {
			sendMsg('chat', $('#message').val());
			if($("#check-minutes").prop('checked')) {
				// $('#markdown-minutes').get(0).value += $('#message').val() + '\n';
				$('#demoStringInput').get(0).value += $('#message').val() + '\n';
				rtpg.string.onInput();
			}
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