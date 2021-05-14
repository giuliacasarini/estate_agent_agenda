var http = require('http');
var fs = require('fs');
var myurl = require('url');
var express = require('express');
var bodyParser = require('body-parser');
var dbconnection = require('./dbcon');

var server = express();
server.use(bodyParser.json()); // support json encoded bodies
server.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

server.listen(5678, function () {
	console.log('========= SERVER INFO =========');
	console.log('        Server started!!       ');
	console.log('===============================');
	console.log('\n\n');
});
server.post('/login',	login);
server.get('/api',	 getApiInfo);
server.get('/users', listUsers);

//login
function login(req) {
	var email = req.body.email;
	var password = req.body.password;
	console.log(password);
	console.log(email);
	var sql = "SELECT * FROM agente WHERE email = '" + email + "' AND password = '" + password + "'";
	if (email == '' || password == '') {
		console.log('Inserisci bene le credenziali');
		return;
	}
	else{
			dbconnection.query(sql, function (err, result) {
				if (err) throw err;
				console.log(result.length);
				if (result.length == 1) {
					console.log("Logged In!");
					//locate="index.html"
				}
				else {
					console.log("credenziali sbagliate");
					return false;
				}
			});
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
