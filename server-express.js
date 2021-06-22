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
	searchParams();
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
		if (results){
			var params = JSON.stringify(results)
			server.locals.searchParams = params;
		}
	});
}

server.get('/home', function(request, response) {
	if (request.session.loggedin) {
		response.render('index');
	} else {
		response.redirect('/');
	}
});

server.get('/appuntamenti', function(request, response) {
	if (request.session.loggedin) {
		response.render('calendar');
	} else {
		response.redirect('/');
	}
});

server.get('/clienti', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente', function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var cliente = JSON.stringify(results);
				response.render('clients-grid', {cliente:cliente});
			}
			else{
				response.render('clients-grid');
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/clienti/:id', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE id = ?', [request.params.id], function(error, results, fields) {
			if (results) {
				var cliente = JSON.stringify(results);
				response.render('client-single', {cliente:cliente});
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/agenti', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM agente', function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var agente = JSON.stringify(results);
				response.render('agents-grid', {agente:agente});
			}
			else{
				response.render('agents-grid');
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/agenti/:id', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM agente WHERE id = ?', [request.params.id], function(error, results, fields) {
			if (results) {
				var agente = JSON.stringify(results);
				response.render('agent-single', {agente:agente});
			}
		});
	} else {
		response.redirect('/');
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
		response.redirect('/');
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
		response.redirect('/');
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
		response.redirect('/');
	}
});

server.post('/ricercaproprieta', function(request, response) {
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
		response.redirect('/');
	}
});	