var express = require('express');
var config = require('config');
var wrap = require('co-express');
var db = require('./db')();
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var app = express();
var pages = require('./controllers/page');
var users = require('./controllers/user');

app.disable('x-powered-by');
app.set('view engine', 'jade');

app.locals.basedir = './';
app.locals.pretty = true;
app.locals.domain = config.domain;

app.use(require('compression')());
app.use(express.static('public'));
app.use(require('body-parser').urlencoded({ extended: false }));

app.use(session({
	name: 'session',
	secret: 'foo',
	resave: false,
	saveUninitialized: true,
	store: new MongoStore({ mongooseConnection: db })
}));

app.use(wrap(function* (req, res, next) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	if (ip.startsWith('::ffff:')) ip = ip.substring(7);
	res.locals.ip = ip;

	try {
		users.setSession(req, yield users.checkSession(req));
	} catch (err) {
		users.setSession(req);
	}

	res.locals.loggedIn = Boolean(req.session.user);
	res.locals.user = req.session.user;

	next();
}));

app.get('/', pages.home);
app.post('/', pages.homePost);
app.get('/about', pages.about);
app.get('/register', users.register);
app.post('/register', users.registerPost);
app.get('/login', users.login);
app.post('/login', users.loginPost);
app.get('/logout', users.logout);
app.get('/update', users.update);
app.post('/update', users.update);
app.get('/status.json', users.status);

module.exports = app;
