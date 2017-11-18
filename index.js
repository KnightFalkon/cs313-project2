// const express = require('express')
// const path = require('path')
// const PORT = process.env.PORT || 5000

// express()
//   .use(express.static(path.join(__dirname, 'public')))
//   .set('views', path.join(__dirname, 'views'))
//   .set('view engine', 'ejs')
//   .get('/', (req, res) => res.render('pages/index'))
//   .listen(PORT, () => console.log(`Listening on ${ PORT }`))

var express = require('express');
var app = express();

var { Client } = require("pg"); // This is the postgres database connection module.


const bcrypt = require('bcrypt');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', (req, res) => res.render('pages/index'))

app.get('/createPerson', function(request, response) {
	createPerson(request, response);
});

app.get('/getPerson', function(request, response) {
	getPerson(request, response);
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

function createPerson(request, response) {
	// First get the person's id
  var username = request.query.username;
  var password = request.query.password;
  var name = request.query.name;
  var street = request.query.street;
  var city = request.query.city;
  var state = request.query.state;
  var zip = request.query.zip;
  var cardNum = request.query.cardNum;

  password = bcrypt.hashSync(password, 10);

	// use a helper function to query the DB, and provide a callback for when it's done
	createPersonOnDb(username, password, name, street, city, state, zip, cardNum, function(error, result) {
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

} // end of getPersonFromDb

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