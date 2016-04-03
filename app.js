var express = require('express');
var config = require('config');
var db = require('./db')();
var User = require('./models/user');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var app = express();

app.set('trust proxy', 1);
app.set('view engine', 'jade');

app.locals.pretty = true;
app.locals.domain = config.domain;

app.use(express.static('public'));

app.use(session({
	name: 'session',
	secret: 'foo',
	resave: false,
	saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: db })
}));

app.use(function (req, res, next) {
	res.locals.ip = req.connection.remoteAddress;
	res.locals.loggedIn = req.session.loggedIn || false;

	next();
});

app.get('/', function (req, res) {
	// req.session.email = 'mat.lomax@gmail.com';
	// req.session.loggedIn = true;
	res.render('index', { title: 'localdns.in', user: req.session.user });
});

app.get('/login', function (req, res) {
    res.render('login', { title: 'Login' });
});

app.get('/update', function (req, res) {
    if (!res.locals.loggedIn) {
		res.sendStatus(403);
		return res.end();
	}

	var user = User.findOne({ email: req.session.email }, function (err, doc) {
		if (!err && doc) {
			doc.ip = res.locals.ip;
			doc.save();
			res.sendStatus(204);
		} else {
			res.sendStatus(404);
		}

		return res.end();
	});
});

module.exports = app;
