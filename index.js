var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var session = require('express-session');
var jquery = require('jquery');
global.$ = global.jquery = jquery;
var { Client } = require("pg"); // This is the postgres database connection module.


const bcrypt = require('bcrypt');

app.set('port', (process.env.PORT || 5000));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(session ({
  secret: 'RagerGamer',
  resave: false,
  saveUninitialized: true
}));

app.get('/signin', (req, res) => res.render('pages/signin'));

app.post('/login', function(req, res) {
  verifyUser(req, res, function(error, result) {
    if(error)
      throw error;
    if(req.session.username == req.body.username) {
      res.render('pages/browse');
    }
    else {
			res.render('pages/signin');
      res.status(401).send({message: 'Username or Password is incorrect'});
    }
  });
});

function verifyUser(request, response, callback) {
	// First get the person's id
  var username = request.body.username;
  var password = request.body.password;

	// TODO: It would be nice to check here for a valid id before continuing on...

	// use a helper function to query the DB, and provide a callback for when it's done
	verifyUserOnDb(username, password, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a row with the person, then prepare JSON to send back
		if (error || result == null) {
      console.log("you know hte place");//response.status(500).json({success: false, data: error});
      callback(error, null);
    } else {
      console.log("setting session username");
      request.session.username = username; //sets user
      callback(null, "success");
      //response.render('pages/browse')
		}
	});
}

function verifyUserOnDb(username, password, callback) {

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "SELECT password FROM users WHERE username = $1";
		var params = [username];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

      if(bcrypt.compareSync(password, result.rows[0].password)) {
        callback(null, result.rows);
      }
      else {
        callback(err, null);
      }
			

		});
	});

} 

app.get('/signup', (req,res) => res.render('pages/signup'))

app.post('/logup', function(req, res) {
  createPerson(req, res);
})

app.use(express.static(__dirname + '/public'));

app.use(function verifyLogin(req, res, next) {
  if(req.session.username) {
    next();
  }
  else {
    res.status(401).send({message: 'You must be logged in.'});
  }
});

// views is directory for all template files
// this is for testing
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', (req, res) => res.render('pages/index'))
app.get('/browse', (req,res) => res.render('pages/browse'))
app.get('/cart', (req,res) => res.render('pages/cart'))
app.get('/checkout', (req,res) => res.render('pages/checkout'))
app.get('/account', (req,res) => res.render('pages/account'))
app.get('/checkout', (req,res) => res.render('pages/checkout'))
app.get('/updateInfo', (req,res) => res.render('pages/updateInfo'))
app.get('/confirm', (req,res) => res.render('pages/confirm'))

app.get('/deleteItem', function(req, res) {
	// req.session.games = $.grep(req.session.games, function(e) {
	// 	return e.id != req.query.id;
	// })
	var newCart = [];
	for(var i = 0; i < req.session.games.length; ++i) {
		if(req.session.games[i].id == req.query.id) {
			if(req.session.games[i].amount > 1) {
				req.session.games[i].amount -= 1;
				newCart.push(req.session.games[i]);
			}
			else {
				//do not add to newCart
			}
		}
		else if(req.session.games[i].id != req.query.id) {
			newCart.push(req.session.games[i]);
		}
	}
	req.session.games = newCart;
	console.log("here is the new session");
	res.status(200).send({message: "success"});
});

app.get('/getSession', function(req, res) {
	res.status(200).send({session : req.session});
});

app.get('/addToCart', function(req, res) {

  var index = -1;     
  var needed = false;
  if(req.session.games) {}
  else {
    req.session.games = [];
    needed = true;
  }
  for(var i = 0; i < req.session.games.length; ++i) {
    if(req.query.id == req.session.games[i].id) {
      index = i;
      break;
    }
  } 
  if(index == -1) {
    req.session.games.push({id : req.query.id, name: req.query.name, amount : 1});
    // these if stateents are used to make sure the correct amount is passed
    // back for display purposes
    if(needed) {
      res.status(200).send({amount : req.session.games[0].amount});    
    }
    else if(!needed) {
      res.status(200).send({amount : req.session.games[req.session.games.length-1].amount});    
    }
  }
  else {
    req.session.games[index].amount += 1;
    res.status(200).send({'amount' : req.session.games[index].amount});   
  }

});

app.get('/getCart', function(req, res) {

  getGamesFromDb(function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a rows with games, then prepare JSON to send back
		if (error || result == null) {
			res.status(500).json({success: false, data: error});
		} else {
      //var person = result[0];
			res.status(200).json({games: result, session: req.session.games});
    }
    console.log("games have been retrieved");
	});
});

app.get('/clearCart', function(req, res) {
	req.session.games = [];
	res.status(200).send({message : "Games cleared"});
});

app.get('/logout', function(req, res) {
  req.session.destroy();
  res.render('pages/signin');
})

app.post('/createPerson', function(request, response) {
  createPerson(request, response);
  response.render('pages/it_worked');
});

function createPerson(request, response) {
	// First get the person's id
  var username = request.body.username;
  var nonHash = request.body.password;
  var name = request.body.name;
  var street = request.body.street;
  var city = request.body.city;
  var state = request.body.state;
  var zip = request.body.zip;
  var cardNum = request.body.cardNum;

  console.log("password is: " + nonHash);
  console.log("username is: " + username);

  password = bcrypt.hashSync(nonHash, 10);

	// use a helper function to query the DB, and provide a callback for when it's done
	createPersonOnDb(username, password, name, street, city, state, zip, cardNum, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a row with the person, then prepare JSON to send back
		if (error || result == null) {
			response.status(500).json({success: false, data: error});
		} else {
      request.session.username = username;
      response.render('pages/browse');
    }
    console.log("user created");
	});
}

function createPersonOnDb(username, password, name, street, city, state, zip, cardNum, callback) {
	//console.log("creating person on DB with id: " + id);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		// var sql = "SELECT id, first, last, birthdate FROM person WHERE id = $1::int";
    // var params = [id];
    
    var sql = "INSERT INTO users (username, password, name, street, city, state, zip, card_num) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
		var params = [username, password, name, street, city, state, zip, cardNum];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// logs whether it was successful
			callback(null, "success");
		});
	});

} // end of CreatePersonFromDb


app.get('/getPerson', function(request, response) {
	getPerson(request, response);
});

function getPerson(request, response) {
	// First get the person's id
	var username = request.session.username;

	// TODO: It would be nice to check here for a valid id before continuing on...

	// use a helper function to query the DB, and provide a callback for when it's done
	getPersonFromDb(username, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a row with the person, then prepare JSON to send back
		if (error || result == null || result.length != 1) {
			response.status(500).json({success: false, data: error});
		} else {
			var person = result[0];
			response.status(200).json(result[0]);
		}
	});
}

function getPersonFromDb(username, callback) {
	console.log("Getting person from DB with username: " + username);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "SELECT id, username, name, street, city, state, zip, card_num FROM users WHERE username = $1";
		var params = [username];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			console.log("Found result: " + JSON.stringify(result.rows));

			// call whatever function the person that called us wanted, giving it
			// the results that we have been compiling
			callback(null, result.rows);
		});
	});

} // end of getPersonFromDb


app.post('/updatePerson', function(request, response) {
  updatePerson(request, response);
});

function updatePerson(request, response) {
  // First get the person's id
  
  var username = request.session.username;
  var name = request.body.name;
  var street = request.body.street;
  var city = request.body.city;
  var state = request.body.state;
  var zip = request.body.zip;
  var cardNum = request.body.cardNum;

	// use a helper function to query the DB, and provide a callback for when it's done
	updatePersonOnDb(username, name, street, city, state, zip, cardNum, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a row with the person, then prepare JSON to send back
		// if (error || result == null || result.length != 1) {
		// 	response.status(500).json({success: false, data: error});
		// } else {
		// 	var person = result[0];
		// 	response.status(200).json(result[0]);
		// }
		response.render('pages/account');
    console.log("user created");
	});
}

function updatePersonOnDb(username, name, street, city, state, zip, cardNum, callback) {
	//console.log("creating person on DB with id: " + id);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		// var sql = "SELECT id, first, last, birthdate FROM person WHERE id = $1::int";
    // var params = [id];
    
    var sql = "UPDATE users SET name = $2, street = $3, city = $4, state = $5, zip = $6, card_num = $7 WHERE username = $1";
		var params = [username, name, street, city, state, zip, cardNum];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// logs whether it was successful
			callback(null, "success");
		});
	});

} // end of updatePersonOnDb


app.get('/updatePassword', function(request, response) {
  updatePassword(request, response);
  response.render('pages/it_worked');
});

function updatePassword(request, response) {
  // First get the person's id
  
  var id = request.query.id;
  var oldPassword = request.query.oldPassword;
  var newPassword = request.query.newPassword;

  bcrypt.compareSync()

	// use a helper function to query the DB, and provide a callback for when it's done
	updatePasswordOnDb(id, name, street, city, state, zip, cardNum, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a row with the person, then prepare JSON to send back
		// if (error || result == null || result.length != 1) {
		// 	response.status(500).json({success: false, data: error});
		// } else {
		// 	var person = result[0];
		// 	response.status(200).json(result[0]);
    // }
    console.log("user created");
	});
}

function updatePasswordOnDb(id, name, street, city, state, zip, cardNum, callback) {
	//console.log("creating person on DB with id: " + id);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		// var sql = "SELECT id, first, last, birthdate FROM person WHERE id = $1::int";
    // var params = [id];
    
    var sql = "UPDATE users SET name = $2, street = $3, city = $4, state = $5, zip = $6, card_num = $7 WHERE id = $1";
		var params = [id, name, street, city, state, zip, cardNum];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// logs whether it was successful
			callback(null, "success");
		});
	});

} // end of getPersonFromDb


app.get('/createGame', function(request, response) {
  createGame(request, response);
  response.render('pages/it_worked');
});

function createGame(request, response) {
	// First get the person's id
  var title = request.query.title;
  var rating = request.query.rating;
  var msrb = request.query.msrb;
  var stock = request.query.stock;
  var buyPrice = request.query.sellPrice * .2;
  var sellPrice = request.query.sellPrice;
  var picture = request.query.picture;
  var description = request.query.description;

	// use a helper function to query the DB, and provide a callback for when it's done
	createGameOnDb(title, rating, msrb, stock, buyPrice, sellPrice, picture, description, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a row with the person, then prepare JSON to send back
		// if (error || result == null || result.length != 1) {
		// 	response.status(500).json({success: false, data: error});
		// } else {
		// 	var person = result[0];
		// 	response.status(200).json(result[0]);
    // }
    console.log("user created");
	});
}

function createGameOnDb(title, rating, msrb, stock, buyPrice, sellPrice, picture, description, callback) {
	//console.log("creating person on DB with id: " + id);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		// var sql = "SELECT id, first, last, birthdate FROM person WHERE id = $1::int";
    // var params = [id];
    
    var sql = "INSERT INTO games (name, rating, msrb, stock, buy_price, sell_price, picture, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
		var params = [title, rating, msrb, stock, buyPrice, sellPrice, picture, description];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// logs whether it was successful
			callback(null, "success");
		});
	});

} // end of CreatePersonFromDb

app.get('/getGames', function(request, response) {
  getGames(request, response);
});

function getGames(request, response) {
	// First get the person's id
	// use a helper function to query the DB, and provide a callback for when it's done
	getGamesFromDb(function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a rows with games, then prepare JSON to send back
		if (error || result == null) {
			response.status(500).json({success: false, data: error});
		} else {
			//var person = result[0];
			response.status(200).json(result);
    }
    console.log("games have been retrieved");
	});
}

function getGamesFromDb(callback) {
	//console.log("creating person on DB with id: " + id);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}
    
    var sql = "SELECT id, name, rating, msrb, stock, buy_price, sell_price, picture, description FROM games WHERE stock > 0";
		var params = [];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// logs whether it was successful
			callback(null, result.rows);
		});
	});

} // end of getGamesFromDb


app.get('/boughtStock', function(request, response) {
  updateStock(request, response);
  response.render('pages/it_worked');
});

app.get('/soldStock', function(request, response) {
  request.query.stock *= (-1);
  updateStock(request, response);
  response.render('pages/it_worked');
});

function updateStock(request, response) {
  // First get the person's id
  var game_id = request.query.id;
  var stock = request.query.stock;

	// use a helper function to query the DB, and provide a callback for when it's done
	updateStockOnDb(game_id, stock, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a row with the person, then prepare JSON to send back
		// if (error || result == null || result.length != 1) {
		// 	response.status(500).json({success: false, data: error});
		// } else {
		// 	var person = result[0];
		// 	response.status(200).json(result[0]);
    // }
    console.log("user created");
	});
}

function updateStockOnDb(game_id, stock, callback) {
	//console.log("creating person on DB with id: " + id);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		// var sql = "SELECT id, first, last, birthdate FROM person WHERE id = $1::int";
    // var params = [id];
    
    var sql = "UPDATE games SET stock = $1 WHERE id = $2";
		var params = [stock, game_id];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// logs whether it was successful
			callback(null, result.rows);
		});
	});

} // end of CreatePersonFromDb

app.get('/createTransaction', function(request, response) {
  createTransaction(request, response);
});

function createTransaction(request, response) {
	// First get the person's id
  var username = request.query.username;
  var game_id = request.query.game_id;
  var date = "now()";


	// use a helper function to query the DB, and provide a callback for when it's done
	createTransactionOnDb(username, game_id, date, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a row with the person, then prepare JSON to send back
		if (error || result == null) {
			response.status(500).json({success: false, data: error});
		} else {
			response.status(200).json(result);
    }
    console.log("transaction created");
	});
}

function createTransactionOnDb(username, game_id, date, callback) {
	//console.log("creating person on DB with id: " + id);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		// var sql = "SELECT id, first, last, birthdate FROM person WHERE id = $1::int";
    // var params = [id];
    
    var sql = "INSERT INTO transactions (user_id, game_id, purchase_date) VALUES ((SELECT id FROM users WHERE username = $1), $2, $3)";
		var params = [username, game_id, date];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// logs whether it was successful
			callback(null, "success");
		});
	});

} // end of CreatePersonFromDb

app.get('/getUsersGames', function(request, response) {
  getUsersGames(request, response);
});

function getUsersGames(request, response) {
	username = req.session.username;
	// First get the person's id
	// use a helper function to query the DB, and provide a callback for when it's done
	getUsersGamesFromDb(username, function(error, result) {
		// This is the callback function that will be called when the DB is done.
		// The job here is just to send it back.

		// Make sure we got a rows with games, then prepare JSON to send back
		if (error || result == null) {
			response.status(500).json({success: false, data: error});
		} else {
			//var person = result[0];
			response.status(200).json(result);
    }
    console.log("games have been retrieved");
	});
}

function getUsersGamesFromDb(username, callback) {
	//console.log("creating person on DB with id: " + id);

	const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}
    
    var sql = 'SELECT g.name AS name FROM transactions AS t INNER JOIN games AS g ON g.id = t.game_id WHERE t.username = $1';
		var params = [username];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// logs whether it was successful
			callback(null, result.rows);
		});
	});

} // end of getGamesFromDb


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});