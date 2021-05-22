var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var dbconnection = require('./dbcon');
var path = require('path');
var ejs = require('ejs');

var server = express();
server.use(bodyParser.json()); // support json encoded bodies
server.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
server.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
server.use('/public', express.static('public'));
server.set('view engine', 'ejs');

server.listen(5678, function () {
	console.log('========= SERVER INFO =========');
	console.log('        Server started!!       ');
	console.log('===============================');
	console.log('\n\n');
});



server.get('/', function(request, response) {
	if (request.session.loggedin) {
		response.redirect('/home');
	} else {
		response.render('login');
	}
});

server.post('/login', function(request, response) {
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
});

function searchParams() {
		dbconnection.query('SELECT DISTINCT categoria FROM proprieta; SELECT DISTINCT tipo FROM proprieta; SELECT DISTINCT citta FROM proprieta', function(error, results) { 		
			if (error) throw error;
			params = [];
			for(var i=0; i < results[0].length; i++) {
				params.push(results[0][i]);
			}
			for(var i=0; i < results[1].length; i++) {
				params.push(results[1][i]);
			}
			console.log(params);
			proprieta = "ciao";
			return proprieta;
		});
}

server.locals.searchParams = searchParams();

server.get('/home', function(request, response) {
	if (request.session.loggedin) {
		response.render('index');
	} else {
		response.send('Please login to view this page!');
	}
});

server.get('/appuntamenti', function(request, response) {
	if (request.session.loggedin) {
		response.render('appuntamenti');
	} else {
		response.send('Please login to view this page!');
	}
});

server.get('/clienti', function(request, response) {
	if (request.session.loggedin) {
		response.render('clienti');
	} else {
		response.send('Please login to view this page!');
	}
});

server.get('/agenti', function(request, response) {
	if (request.session.loggedin) {
		response.render('agents-grid');
	} else {
		response.send('Please login to view this page!');
	}
});

server.get('/agenti/:id', function(request, response) {
	if (request.session.loggedin) {
		response.render('agent-single');
	} else {
		response.send('Please login to view this page!');
	}
});

server.get('/proprieta', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM proprieta', function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var proprieta = JSON.stringify(results);
				response.render('property-grid', {proprieta:proprieta});
			}
			else{
				response.render('property-grid');
			}
		});	

	} else {
		response.send('Please login to view this page!');
	}
});

server.get('/proprieta/:id', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM proprieta WHERE id = ?', [request.params.id], function(error, results, fields) {
			if (results) {
				var proprieta = JSON.stringify(results);
				response.render('property-single', {proprieta:proprieta});
			}
		});	
	}
	else {
		response.send('Please login to view this page!');
	}
});

server.get('/proprieta/:categoria/:contratto', function(request, response) {
	if (request.session.loggedin) {
		if(request.params.contratto == 'affitto'){
			dbconnection.query('SELECT * FROM proprieta WHERE categoria = ?  AND affitto = 1', [request.params.categoria], function(error, results, fields) {
				if (error) throw error;
				if (results) {
					var proprieta = JSON.stringify(results);
					response.render('property-grid', {proprieta:proprieta});
				}
				else{
					response.render('property-grid');
				}
			});
		} else if (request.params.contratto == 'vendita'){
			dbconnection.query('SELECT * FROM proprieta WHERE categoria = ? AND vendita = 1', [request.params.categoria], function(error, results, fields) {
				if (error) throw error;
				if (results) {
					var proprieta = JSON.stringify(results);
					response.render('property-grid', {proprieta:proprieta});
				}
				else{
					response.render('property-grid');
				}
			});
		} else {
			dbconnection.query('SELECT * FROM proprieta WHERE categoria = ?; SELECT * FROM proprieta WHERE categoria = ?  AND affitto = 1', [request.params.categoria, request.params.categoria], function(error, results, fields) {
				if (error) throw error;
				if (results) {
					var proprieta_array = [];
					for (var i=0; i <  results[0].length; i++) {
						proprieta_array.push(results[0][i]);
					}
					for (var i=0; i <  results[1].length; i++) {
						proprieta_array.push(results[1][i]);
					}
					var proprieta = JSON.stringify(proprieta_array);
					response.render('property-grid', {proprieta:proprieta});
				}
				else{
					response.render('property-grid');
				}
			});
		}
		
	} else {
		response.send('Please login to view this page!');
	}
});



/***** Supports Functions *****/
server.get('/api', function(request, response) {
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
});
