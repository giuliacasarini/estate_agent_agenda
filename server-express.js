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
	dbconnection.query('SELECT DISTINCT categoria FROM proprieta; SELECT DISTINCT tipo FROM proprieta; SELECT DISTINCT citta FROM proprieta; SELECT DISTINCT nomeServizio FROM servizio;', function(error, results) { 		
		if (error) throw error;
		if (results){
			var params = JSON.stringify(results)
			server.locals.searchParams = params;
		}
	});
}

server.get('/home', function(request, response) {
	var id_agente = request.session.username;
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM agente', function(error, results, fields) {
		if (error) throw error;
			if (results) {
			var agente = JSON.stringify(results);
			dbconnection.query('SELECT * FROM appuntamento WHERE id_agente = ?', [id_agente], function(error, results, fields) {
				if (error) throw error;
				if (results) {
					var eventi = JSON.stringify(results);
					response.render('index', {agente:agente, eventi:eventi});
				}
			});	
			}
		});
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

server.get('/acquirenti', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE acquirente = 1', function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var acquirente = JSON.stringify(results);
				response.render('buyers-grid', {acquirente:acquirente});
			}
			else{
				response.render('buyers-grid');
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/acquirenti/:id', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE cliente.cf = ? ; SELECT * FROM cliente, proprieta, contratto_affitto WHERE cliente.cf = ?  and cliente.cf = contratto_affitto.cf_cliente and contratto_affitto.id_proprieta = proprieta.id GROUP BY contratto_affitto.id; SELECT * FROM cliente, proprieta, contratto_vendita WHERE cliente.cf = ?  and cliente.cf = contratto_vendita.cf_cliente and contratto_vendita.id_proprieta = proprieta.id GROUP BY contratto_vendita.id;', [request.params.id, request.params.id, request.params.id], function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var acquirente = JSON.stringify(results);
				response.render('buyer-single', {acquirente:acquirente});
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/proprietari', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE proprietario = 1', function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var proprietario = JSON.stringify(results);
				response.render('owners-grid', {proprietario:proprietario});
			}
			else{
				response.render('owners-grid');
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/proprietari/:id', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE cliente.cf = ? ; SELECT * FROM cliente, proprieta, immagine WHERE cliente.cf = ? and proprieta.cf_cliente = cliente.cf and immagine.id_proprieta = proprieta.id GROUP BY proprieta.id', [request.params.id, request.params.id], function(error, results, fields) {
			
			if (error) throw error;
				console.log(error);
			if (results) {
				var proprietario = JSON.stringify(results);
				
				response.render('owner-single', {proprietario:proprietario});
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

server.get('/contrattiAffitto', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM contratto_affitto, proprieta, cliente where cliente.cf = contratto_affitto.cf_cliente and proprieta.id = contratto_affitto.id_proprieta', function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var contratto = JSON.stringify(results);
				response.render('rentcontracts-grid', {contratto:contratto});
			}
			else{
				response.render('rentcontracts-grid');
			}
		});	
	} else {
		response.redirect('/');
	}
});
server.get('/contrattiVendita', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM contratto_vendita, proprieta, cliente where cliente.cf = contratto_vendita.cf_cliente and proprieta.id = contratto_vendita.id_proprieta', function(error, results, fields) {
			if (error) throw error;
			if (results) {
				var contratto = JSON.stringify(results);
				response.render('salecontracts-grid', {contratto:contratto});
			}
			else{
				response.render('salecontracts-grid');
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
		dbconnection.query('SELECT * FROM proprieta, immagine, cliente, servizio, servizio_disponibile WHERE proprieta.id = ? AND proprieta.id = immagine.id_proprieta and cliente.cf = proprieta.cf_cliente and servizio_disponibile.id_proprieta = proprieta.id and servizio_disponibile.id_servizio = servizio.id', [request.params.id], function(error, results, fields) {		
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
	var categoria = request.body.categoria;
	var nome = request.body.name;
	var cognome = request.body.surname;
	var email = request.body.email;
	var telefono = request.body.phone;
	var cf = request.body.cf;
	if (request.session.loggedin) {
		if (categoria == 'acquirente'){
		dbconnection.query("INSERT INTO cliente (telefono,email, nome, cognome, proprietario, acquirente, cf) VALUES (?, ?, ?, ?, 0, 1, ?)", [telefono,email, nome, cognome, cf], function(error, results, fields) {
			if (error) throw error;
			if (results) {
				response.redirect('/acquirenti');
			}
		});
		}
		else{
			dbconnection.query("INSERT INTO cliente (telefono,email, nome, cognome, proprietario, acquirente, cf) VALUES (?, ?, ?, ?, 1, 0, ?)", [telefono, email, nome, cognome, cf], function(error, results, fields) {
		
			if (error) throw error;
			if (results) {
				response.redirect('/proprietari');
			}
			});	
		}

	} else {
		response.redirect('/');
	}
});



server.post('/nuovocontratto', function(request, response) {
	var categoria = request.body.categoria;
	var nome = request.body.name;
	var cognome = request.body.surname;
	var email = request.body.email;
	var telefono = request.body.phone;
	
	if (request.session.loggedin) {
		if (categoria == 'affitto'){
		dbconnection.query("INSERT INTO contratto_affitto (nome, cognome, email, telefono) VALUES (?, ?, ?, ?)", [nome, cognome, email, telefono], function(error, results, fields) {
			if (error) throw error;
			if (results) {
				response.redirect('/contrattiAffitto');
			}
		});
		}
		else{
			dbconnection.query("INSERT INTO contratto_vendita (telefono,email, nome, cognome) VALUES (?, ?, ?, ?)", [telefono, email, nome, cognome], function(error, results, fields) {
		
			if (error) throw error;
			if (results) {
				response.redirect('/contrattiVendita');
			}
			});	
		}

	} else {
		response.redirect('/');
	}
});

server.get('/inseriscicontratto', function(request, response) {
	if (request.session.loggedin) {
			response.render('contract-add');
	} else {
		response.redirect('/');
	}
});
server.get('/inserisciproprieta', function(request, response) {
		
	if (request.session.loggedin) {
		dbconnection.query('SELECT nome, cognome FROM cliente WHERE proprietario = 1', function(error, results, fields) {
				if (error) throw error;
				if (results) {
					var proprietari = JSON.stringify(results);
					response.render('property-add', {proprietari:proprietari});
				}
				else{
					response.render('property-add');
				}
			});
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
		dbconnection.query("INSERT INTO proprieta (cf_cliente, disponibile, prezzo, affitto, vendita, via, citta, categoria, tipo) VALUES (1, 1, ?, ?, ?, ?, ?, ?, ?)", [prezzo, affitto, vendita, indirizzo, citta, categoria, tipo], function(error, results, fields) {
			
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