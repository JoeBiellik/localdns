var express = require('express');
var config = require('config');
var db = require('./db')();
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
	//req.session.user = 'Demo';
	res.render('index', { title: 'localdns.in', user: req.session.user });
});

app.get('/login', function (req, res) {
    res.render('login', { title: 'Login' });
});

module.exports = app;
