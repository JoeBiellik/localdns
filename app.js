var express = require('express');
var db = require('./db')();
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var app = express();

app.enable('trust proxy', 1);
app.locals.pretty = true;
app.set('view engine', 'jade');
app.use(express.static('public'));

app.use(session({
	name: 'session',
	secret: 'foo',
	resave: false,
	saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: db })
}));

app.get('/', function (req, res) {
	//req.session.user = 'Demo';
	res.render('index', { title: 'localdns.in', ip: req.connection.remoteAddress, user: req.session.user });
});

app.get('/login', function (req, res) {
    res.redirect('/');
});

module.exports = app;
