var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var dbconnection = require('./dbcon');
var path = require('path');
var ejs = require('ejs');
var multer = require('multer');

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

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/assets/img/');
    },
  
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

var upload = multer({ storage: storage })

server.get('/', function(request, response) {
	if (request.session.loggedin) {
		response.redirect('/home');
	} else {
		response.render('login');
	}
});

server.get('/logout', function(request, response) {
	request.session.loggedin = false;
	response.render('login');
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
	var id_agente = request.session.username;
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM appuntamento WHERE id_agente = ?', [id_agente], function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var eventi = JSON.stringify(results);
				response.render('calendar', {eventi:eventi});
			}
			else{
				response.render('calendar');
			}
		});	

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
		dbconnection.query('SELECT * FROM proprieta, immagine WHERE id = id_proprieta GROUP BY id', function(error, results, fields) {
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
		dbconnection.query('SELECT * FROM proprieta, immagine WHERE id = ? AND id = id_proprieta', [request.params.id], function(error, results, fields) {
			if (results) {
				var proprieta = JSON.stringify(results);
				console.log(proprieta);
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
			dbconnection.query('SELECT  * FROM proprieta, immagine WHERE categoria = ?  AND affitto = 1 and id = id_proprieta GROUP BY id', [request.params.categoria], function(error, results, fields) {
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
			dbconnection.query('SELECT * FROM proprieta, immagine WHERE categoria = ? AND vendita = 1 AND id = id_proprieta GROUP BY id', [request.params.categoria], function(error, results, fields) {
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
			dbconnection.query('SELECT * FROM proprieta, immagine WHERE categoria = ? AND id = id_proprieta GROUP BY id', [request.params.categoria], function(error, results, fields) {
				if (error) throw error;
				if (results) {
					var proprieta = JSON.stringify(results);
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
		 query = "SELECT * FROM proprieta, immagine WHERE prezzo >= " + request.body.pricemin + " AND prezzo <= " + request.body.pricemax + " AND id = id_proprieta ";
		 if (request.body.category != null){
			 query += "AND categoria = '" + request.body.category + "' ";
		 }
		 if (request.body.type != null){
			 query += "AND tipo = '" + request.body.type + "' ";
		 }
		 if (request.body.city != null){
			 query += "AND citta = '" + request.body.city + "' ";
		 }
		 query += "GROUP BY id";
		dbconnection.query(query, function(error, results, fields) {
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

server.get('/popupcalendario/:data', function(request, response) {
	var id_agente = request.session.username;
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM appuntamento WHERE giorno = ? AND id_agente = ?', [request.params.data, id_agente], function(error, results, fields) {
		if (error) throw error;
		if (results) {
			var eventi = JSON.stringify(results);
			response.render('calendar-popup', {data:request.params.data, eventi:eventi});
		}
		else{
			response.render('calendar-popup', {data:request.params.data});
		}
	});
	} else {
		response.redirect('/');
	}
});

server.post('/nuovoevento', function(request, response) {
	var giorno = request.body.eventdate;
	var orarioinizio = request.body.timestart;
	var orariofine = request.body.timeend;
	var luogo = request.body.where;
	var scopo = request.body.why;
	var id_agente = request.session.username;
	
	if (request.session.loggedin) {
		dbconnection.query("INSERT INTO appuntamento (id_agente, giorno, luogo, scopo, orarioinizio, orariofine) VALUES (?, ?, ?, ?, ?, ?)", [id_agente, giorno, luogo, scopo, orarioinizio, orariofine], function(error, results, fields) {
			if (error) throw error;
			if (results) {
				response.redirect('/popupcalendario/' + giorno);
			}
		});	

	} else {
		response.redirect('/');
	}
});

server.get('/inseriscicliente', function(request, response) {
	if (request.session.loggedin) {
			response.render('client-add');
	} else {
		response.redirect('/');
	}
});

server.post('/nuovocliente', function(request, response) {
	var nome = request.body.name;
	var cognome = request.body.surname;
	var email = request.body.email;
	var telefono = request.body.phone;
	
	if (request.session.loggedin) {
		dbconnection.query("INSERT INTO cliente (nome, cognome, email, telefono) VALUES (?, ?, ?, ?)", [nome, cognome, email, telefono], function(error, results, fields) {
			if (error) throw error;
			if (results) {
				response.redirect('/clienti');
			}
		});	

	} else {
		response.redirect('/');
	}
});

server.get('/inserisciproprieta', function(request, response) {
	if (request.session.loggedin) {
			response.render('property-add');
	} else {
		response.redirect('/');
	}
});

server.post('/nuovaproprieta', upload.array('immagini'), function(request, response) {
	var indirizzo = request.body.ind;
	var citta = request.body.citta;
	var prezzo = request.body.prezzo;
	var categoria = request.body.categoria;
	var tipo = request.body.tipo;
	var vendita = request.body.contrattoVendita;
	if (vendita == "contrattoVendita"){
		vendita = 1;
	}
	else{
		vendita = 0;
	}
	var affitto = request.body.contrattoAffitto;
	if (affitto == "contrattoAffitto"){
		affitto = 1;
	}
	else{
		affitto = 0;
	}
	
	if (request.session.loggedin) {
		dbconnection.query("INSERT INTO proprieta (id_proprietario, disponibile, prezzo, affitto, vendita, via, citta, categoria, tipo) VALUES (1, 1, ?, ?, ?, ?, ?, ?, ?)", [prezzo, affitto, vendita, indirizzo, citta, categoria, tipo], function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var files = request.files;
				for (var i=0; i <  files.length; i++) {
					dbconnection.query("INSERT INTO immagine (percorso, id_proprieta) VALUES (?, ?)", [files[i].filename, results.insertId], function(error, results, fields) {
					if (error) throw error;
					});
				}
				response.redirect('/proprieta');
			}
		});	

	} else {
		response.redirect('/');
	}
});