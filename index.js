var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var session = require('express-session');

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
    
    console.log("session username " + req.session.username);
    console.log("body username " + req.body.username);
    if(req.session.username == req.body.username) {
      res.render('pages/browse');
    }
    else {
      console.log("testing");
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
      console.log("Found result: " + JSON.stringify(result.rows[0].password));

      if(bcrypt.compareSync(password, result.rows[0].password)) {
        console.log("passwords were equal");
        callback(null, result.rows);
      }
      else {
        console.log("passwords were not equal");
        callback(err, null);
      }
			

		});
	});

} // end of getPersonFromDb

app.get('/signup', (req,res) => res.render('pages/signup'))

app.post('/logup', function(req, res) {
  createPerson(req, res);
})

app.use(express.static(__dirname + '/public'));

app.use(function verifyLogin(req, res, next) {
  if(req.session.username != null) {
    next();
  }
  else {
    res.status(401).send({message: 'You are not signed in.'});
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

app.get('/addToCart', function(req, res) {

  console.log("beginning of addToCart");
  var index = -1;     
  if(req.session.games) {
    console.log("games exists");
  }
  else {
    console.log("did not exist, creating games");
    req.session.games = [];
  }
  for(var i = 0; i < req.session.games.length; ++i) {
    console.log("insdie for loop");
    if(req.query.name == req.session.games[i].name) {
      console.log("inside if inside for loop");
      index = i;
      break;
    }
  }
  if(index == -1) {
    console.log("inside index == -1");
    req.session.games.push({'name' : req.query.name, 'amount' : 1});  
    res.status(200).send({message: 'Game added'});    
  }
  else {
    console.log("last one");
    req.session.games[i].amount += 1;
    res.status(200).send({message: 'Game added'});    
    
  }

  ////////////////////////testing
  for(var i = 0; i < req.session.games.length; ++i) {
    console.log(req.session.games[i].name);
  }

});



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
	var id = request.query.id;

	// TODO: It would be nice to check here for a valid id before continuing on...

	// use a helper function to query the DB, and provide a callback for when it's done
	getPersonFromDb(id, function(error, result) {
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

function getPersonFromDb(id, callback) {
	console.log("Getting person from DB with id: " + id);

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

		var sql = "SELECT id, username, name, card_num FROM users WHERE id = $1::int";
		var params = [id];

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


app.get('/updatePerson', function(request, response) {
  updatePerson(request, response);
  response.render('pages/it_worked');  
});

function updatePerson(request, response) {
  // First get the person's id
  
  var id = request.query.id;
  var name = request.query.name;
  var street = request.query.street;
  var city = request.query.city;
  var state = request.query.state;
  var zip = request.query.zip;
  var cardNum = request.query.cardNum;

	// use a helper function to query the DB, and provide a callback for when it's done
	updatePersonOnDb(id, name, street, city, state, zip, cardNum, function(error, result) {
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

function updatePersonOnDb(id, name, street, city, state, zip, cardNum, callback) {
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
  console.log(".5");
  getGames(request, response);
});

function getGames(request, response) {
	// First get the person's id
  console.log('1');
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

		// var sql = "SELECT id, first, last, birthdate FROM person WHERE id = $1::int";
    // var params = [id];
    
    var sql = "SELECT name, rating, msrb, stock, buy_price, sell_price, picture, description FROM games WHERE stock > 0";
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

} // end of CreatePersonFromDb


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
  var game_id = request.query.game_id;
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
  response.render('pages/it_worked');
});

function createTransaction(request, response) {
	// First get the person's id
  var user_id = request.query.user_id;
  var game_id = request.query.game_id;
  var date = "current_date";


	// use a helper function to query the DB, and provide a callback for when it's done
	createTransactionOnDb(user_id, game_id, date, function(error, result) {
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

function createTransactionOnDb(user_id, game_id, date, callback) {
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
    
    var sql = "INSERT INTO transactions (user_id, game_id, date) VALUES ($1, $2, $3)";
		var params = [user_id, game_id, date];

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


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});