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
	searchParams(); // navbar search parameters
});

var storage = multer.diskStorage({
    destination: function(request, file, cb) {
		if (file.mimetype == 'application/pdf') {
			cb(null, 'public/assets/contracts/');
		} else {
			cb(null, 'public/assets/img/');
		}

    },
  
    filename: function(request, file, cb) {
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
	
	dbconnection.query('SELECT * FROM agente WHERE email = ? AND password = ?', [username, password], function(error, results, fields) {
		if (error) {
			console.error(error);
			response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
		} else {
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.username = username;
				response.redirect('/home');
			} else {
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: Credenziali sbagliate!");
			}	
		}		
	});
});

function searchParams() {
	dbconnection.query('SELECT DISTINCT categoria FROM proprieta; SELECT DISTINCT tipo FROM proprieta; SELECT DISTINCT citta FROM proprieta; SELECT DISTINCT nomeServizio FROM servizio;', function(error, results) { 		
		if (error) {
          console.error(error);
		} else {
				var params = JSON.stringify(results)
				server.locals.searchParams = params;
		}
	});
}

server.get('/home', function(request, response) {
	var id_agente = request.session.username;
	
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM agente', function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
					var agente = JSON.stringify(results);
					dbconnection.query('SELECT * FROM appuntamento WHERE id_agente = ?', [id_agente], function(error, results, fields) {
						if (error) {
						  console.error(error);
						  response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
						} else {
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
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var eventi = JSON.stringify(results);
				response.render('calendar', {eventi:eventi});
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
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var eventi = JSON.stringify(results);
				response.render('calendar-popup', {data:request.params.data, eventi:eventi});
			}
		});
	} else {
		response.redirect('/');
	}
});

server.post('/nuovoappuntamento', function(request, response) {
	var giorno = request.body.eventdate;
	var orarioinizio = request.body.timestart;
	var orariofine = request.body.timeend;
	var luogo = request.body.where;
	var scopo = request.body.why;
	var id_agente = request.session.username;
	
	if (request.session.loggedin) {
		dbconnection.query("INSERT INTO appuntamento (id_agente, giorno, luogo, scopo, orarioinizio, orariofine) VALUES (?, ?, ?, ?, ?, ?)", [id_agente, giorno, luogo, scopo, orarioinizio, orariofine], function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				response.redirect('/popupcalendario/' + giorno);
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/acquirenti', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE acquirente = 1', function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				results = [results, []]; //array needed to parse it in ejs model
				var clienti = JSON.stringify(results);
				response.render('clients-grid', {clienti:clienti, tipo:"Acquirenti"});
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/acquirenti/:cf', function(request, response) {
	var cf = request.params.cf;
	
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE cliente.cf = ? ; SELECT * FROM cliente, proprieta, contratto_affitto WHERE cliente.cf = ?  and cliente.cf = contratto_affitto.cf_cliente and contratto_affitto.id_proprieta = proprieta.id GROUP BY contratto_affitto.id; SELECT * FROM cliente, proprieta, contratto_vendita WHERE cliente.cf = ?  and cliente.cf = contratto_vendita.cf_cliente and contratto_vendita.id_proprieta = proprieta.id GROUP BY contratto_vendita.id;', [cf, cf, cf], function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				if (results[0].length > 0){
					var acquirente = JSON.stringify(results);
					response.render('buyer-single', {acquirente:acquirente});
				} else{
					response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: Acquirente inesistente!");
				}
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/proprietari', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE proprietario = 1', function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				results = [[],results]; //array needed to parse it in ejs model
				var clienti = JSON.stringify(results);
				response.render('clients-grid', {clienti:clienti, tipo:"Proprietari"});
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/proprietari/:cf', function(request, response) {
	var cf = request.params.cf;
	
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM cliente WHERE cliente.cf = ? ; SELECT * FROM cliente, proprieta, immagine WHERE cliente.cf = ? and proprieta.cf_cliente = cliente.cf and immagine.id_proprieta = proprieta.id GROUP BY proprieta.id', [cf, cf], function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				if (results[0].length > 0){
					var proprietario = JSON.stringify(results);
					response.render('owner-single', {proprietario:proprietario});
				} else{
					response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: Proprietario inesistente!");
				}
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.post('/ricercacliente', function(request, response) {
	var nome = request.body.name;
	var cognome = request.body.surname;
	
	if (request.session.loggedin) {
		query = "SELECT * FROM cliente WHERE ";
		if (nome != ''){
		 query += "nome = '" + nome + "' AND ";
		}
		if (cognome != ''){
		 query += "cognome = '" + cognome + "' AND ";
		}
		query = query + "acquirente = 1;" + query + "proprietario = 1" ;
		dbconnection.query(query, function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var clienti = JSON.stringify(results);
				response.render('clients-grid', {clienti:clienti, tipo:"Ricerca Clienti"});
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
	    dbconnection.query("SELECT * FROM cliente WHERE cf = ?", [cf], function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				if (results.length == 0) {
					if (categoria == 'acquirente'){
						dbconnection.query("INSERT INTO cliente (telefono,email, nome, cognome, proprietario, acquirente, cf) VALUES (?, ?, ?, ?, 0, 1, ?)", [telefono, email, nome, cognome, cf], function(error, results, fields) {
							if (error) {
								console.error(error);
								response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
							} else {
								response.redirect('/acquirenti');
							}
						});
					}
					else{
						dbconnection.query("INSERT INTO cliente (telefono,email, nome, cognome, proprietario, acquirente, cf) VALUES (?, ?, ?, ?, 1, 0, ?)", [telefono, email, nome, cognome, cf], function(error, results, fields) {
							if (error) {
								console.error(error);
								response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
							} else {
								response.redirect('/proprietari');
							}
						});
					}
				}
				else {
					if (categoria == 'acquirente'){
						dbconnection.query("UPDATE cliente SET acquirente = 1 WHERE cf = ?;", [cf], function(error, results, fields) {
							if (error) {
								console.error(error);
								response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
							} else {
								response.redirect('/acquirenti');
							}
						});
					}
					else{
						dbconnection.query("UPDATE cliente SET proprietario = 1 WHERE cf = ?;", [cf], function(error, results, fields) {
							if (error) {
								console.error(error);
								response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
							} else {
								response.redirect('/proprietari');
							}
						});
					}

				}
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/proprieta', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM proprieta, immagine WHERE id = id_proprieta GROUP BY id', function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var proprieta = JSON.stringify(results);
				response.render('property-grid', {proprieta:proprieta});
			}
		});		
	} else {
		response.redirect('/');
	}
});

server.post('/ricercaproprieta', function(request, response) {
	var prezzomin = request.body.pricemin;
	var prezzomax = request.body.pricemax;
	var categoria = request.body.category;
	var tipo = request.body.type;
	var citta = request.body.city;
	
	if (request.session.loggedin) {
		query = "SELECT * FROM proprieta, immagine WHERE prezzo >= " + prezzomin + " AND prezzo <= " + prezzomax + " AND id = id_proprieta ";
		if (categoria != null){
		 query += "AND categoria = '" + categoria + "' ";
		}
		if (tipo != null){
		 query += "AND tipo = '" + tipo + "' ";
		}
		if (citta != null){
		 query += "AND citta = '" + citta + "' ";
		}
		query += "GROUP BY id";
		dbconnection.query(query, function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var proprieta = JSON.stringify(results);
				response.render('property-grid', {proprieta:proprieta});
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/proprieta/:categoria/:contratto', function(request, response) {
	var categoria = request.params.categoria;
	var contratto = request.params.contratto;
	
	if (request.session.loggedin) {
		if(contratto == 'affitto'){
			dbconnection.query('SELECT  * FROM proprieta, immagine WHERE categoria = ?  AND affitto = 1 and id = id_proprieta GROUP BY id', [categoria], function(error, results, fields) {
				if (error) {
					console.error(error);
					response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
				} else {
					var proprieta = JSON.stringify(results);
					response.render('property-grid', {proprieta:proprieta});
				}
			});
		} else if (contratto == 'vendita'){
			dbconnection.query('SELECT * FROM proprieta, immagine WHERE categoria = ? AND vendita = 1 AND id = id_proprieta GROUP BY id', [categoria], function(error, results, fields) {
				if (error) {
					console.error(error);
					response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
				} else {
					var proprieta = JSON.stringify(results);
					response.render('property-grid', {proprieta:proprieta});
				}
			});
		} else {
			dbconnection.query('SELECT * FROM proprieta, immagine WHERE categoria = ? AND id = id_proprieta GROUP BY id', [categoria], function(error, results, fields) {
				if (error) {
					console.error(error);
					response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
				} else {
					var proprieta = JSON.stringify(results);
					response.render('property-grid', {proprieta:proprieta});
				}
			});
		}	
	} else {
		response.redirect('/');
	}
});

server.get('/proprieta/:id', function(request, response) {
	var id = request.params.id;
	
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM proprieta, immagine, cliente WHERE proprieta.id = ? AND proprieta.id = immagine.id_proprieta and cliente.cf = proprieta.cf_cliente; SELECT * FROM servizio_disponibile, servizio, proprieta WHERE proprieta.id = ? and servizio_disponibile.id_servizio = servizio.id and servizio_disponibile.id_proprieta = proprieta.id', [id, id], function(error, results, fields) {		
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				if (results[0].length > 0){
					var proprieta = JSON.stringify(results);
					response.render('property-single', {proprieta:proprieta});
				} else{
					response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: Proprietà inesistente!");
				}
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/inserisciproprieta', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT nome, cognome FROM cliente WHERE proprietario = 1', function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var proprietari = JSON.stringify(results);
				response.render('property-add', {proprietari:proprietari});
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
	var affitto = request.body.contrattoAffitto;
	
	if (vendita == "contrattoVendita"){
		vendita = 1;
	}
	else{
		vendita = 0;
	}
	
	if (affitto == "contrattoAffitto"){
		affitto = 1;
	}
	else{
		affitto = 0;
	}
	
	if (request.session.loggedin) {
		dbconnection.query("INSERT INTO proprieta (cf_cliente, disponibile, prezzo, affitto, vendita, via, citta, categoria, tipo) VALUES (1, 1, ?, ?, ?, ?, ?, ?, ?)", [prezzo, affitto, vendita, indirizzo, citta, categoria, tipo], function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var files = request.files;
				for (var i=0; i <  files.length; i++) {
					dbconnection.query("INSERT INTO immagine (percorso, id_proprieta) VALUES (?, ?)", [files[i].filename, results.insertId], function(error, results, fields) {
					if (error) {
						console.error(error);
					}
					});
				}
				response.redirect('/proprieta');
			}

		});	
	} else {
		response.redirect('/');
	}
});

server.get('/agenti', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM agente', function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var agente = JSON.stringify(results);
				response.render('agents-grid', {agente:agente});
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/contrattiAffitto', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM contratto_affitto, proprieta, cliente where cliente.cf = contratto_affitto.cf_cliente and proprieta.id = contratto_affitto.id_proprieta', function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var contratto = JSON.stringify(results);
				response.render('rentcontracts-grid', {contratto:contratto});
			}
		});	
	} else {
		response.redirect('/');
	}
});

server.get('/contrattiVendita', function(request, response) {
	if (request.session.loggedin) {
		dbconnection.query('SELECT * FROM contratto_vendita, proprieta, cliente where cliente.cf = contratto_vendita.cf_cliente and proprieta.id = contratto_vendita.id_proprieta', function(error, results, fields) {
			if (error) {
				console.error(error);
				response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
			} else {
				var contratto = JSON.stringify(results);
				response.render('salecontracts-grid', {contratto:contratto});
			}
		});	
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

server.post('/nuovocontratto', upload.single('contratto'), function(request, response) {
	var categoria = request.body.categoria;
	var cf = request.body.cf;
	var id = request.body.id;
	var prezzo = request.body.prezzo;
    var datainizio = request.body.datainizio;
	var datafine = request.body.datafine;
	var nomefile = request.file.filename;
	
	if (request.session.loggedin) {
		if (categoria == 'affitto'){
			dbconnection.query("INSERT INTO contratto_affitto (cf_cliente, id_proprieta, prezzo, inizio, fine, nomefile) VALUES (?, ?, ?, ?, ?, ?)", [cf, id, prezzo, datainizio, datafine, nomefile], function(error, results, fields) {
				if (error) {
					console.error(error);
					response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
				} else {
					response.redirect('/contrattiAffitto');
				}
			});
		} else {
			dbconnection.query("INSERT INTO contratto_vendita (cf_cliente, id_proprieta, prezzo, nomefile) VALUES (?, ?, ?, ?)", [cf, id, prezzo, nomefile], function(error, results, fields) {
				if (error) {
					console.error(error);
					response.send("Si è verificato un errore nel completamento della richiesta. Messaggio di errore: " + error.message);
				} else {
					response.redirect('/contrattiVendita');
				}
			});	
		}
	} else {
		response.redirect('/');
	}
});

server.get('/downloadcontratto/:nomefile', function(request, response) {
	if (request.session.loggedin) {
		var path = 'public/assets/contracts/' + request.params.nomefile;
		response.sendFile(path, { root: '.' });
	} else {
		response.redirect('/');
	}
});