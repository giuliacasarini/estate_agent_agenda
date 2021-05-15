var http = require('http');
var fs = require('fs');
var myurl = require('url');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var dbconnection = require('./dbcon');
var path = require('path');

var server = express();
server.use(bodyParser.json()); // support json encoded bodies
server.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
server.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
server.use(express.static(__dirname + '/public/'));

server.listen(5678, function () {
	console.log('========= SERVER INFO =========');
	console.log('        Server started!!       ');
	console.log('===============================');
	console.log('\n\n');
});
server.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/login.html'));
});
server.get('/home', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/index.html'));
	} else {
		response.send('Please login to view this page!');
	}
});
server.post('/login',	login);
server.get('/api',	 getApiInfo);
server.get('/users', listUsers);

//login
function login(request, response) {
	var username = request.body.email;
	var password = request.body.password;
	
	if (username && password) {
		dbconnection.query('SELECT * FROM agente WHERE email = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.username = username;
				response.redirect('/home');
			} else {
				response.send('Credenziali sbagliate!');
			}			
			response.end();
		});
	} else {
		response.send('Inserisci le credenziali!');
		response.end();
	}
}

function listUsers(request, response) {
  console.log('API - GET: /users ==> listUsers(..)');
  var sql = "SELECT * FROM agente";
	  dbconnection.query(sql, function (err, result) {
		if (err) throw err;
		response.end(JSON.stringify(result));
	  });
}


/***** Supports Functions *****/

function getApiInfo (request, response) {
	console.log('API - GET: /api ==> getApiInfo(..)');

	response.writeHead(200, {'Content-Type': 'text/plain'});
	response.write('----- RESTful Service API Informations -----\n');
	response.write('\nHTTP GET:\n');
	response.write('\t/echo/:name - Return the element (if exists) with specific name (JSON Element).\n');
	response.write('\t/file/:name - Return the file (if exists) with specific name.\n');
	response.write('\t/users - Return a list of users.\n');
	response.write('\t/user/:id - Return a user by id.\n');
	response.write('\nHTTP POST:\n');
	response.write('\t/mypost - Upload data (JSON element).\n');
	response.write('\n----- ----- ----- ----- -----\n');
	response.write('\nJSON element example\n');
	response.write('\t{\n');
	response.write('\t\t"name" : "Joe",\n');
	response.write('\t}\n');
	response.end();
};
