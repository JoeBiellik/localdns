const express = require('express');
const config = require('config');
const wrap = require('co-express');
const db = require('./db')();
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const app = express();
const pages = require('./controllers/page');
const users = require('./controllers/user');

app.disable('x-powered-by');
app.set('view engine', 'pug');

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

app.use(wrap(async (req, res, next) => {
	let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	if (ip.startsWith('::ffff:')) ip = ip.substring(7);
	res.locals.ip = ip;

	try {
		users.setSession(req, await users.checkSession(req));
	} catch (err) {
		users.setSession(req);
	}

	res.locals.loggedIn = Boolean(req.session.user.username);
	res.locals.user = req.session.user;
	res.locals.errors = {};

	next();
}));

app.get('/', pages.home);
app.post('/', users.edit);
app.get('/about', pages.about);
app.get('/register', pages.register);
app.post('/register', users.register);
app.get('/login', pages.login);
app.post('/login', users.login);
app.get('/logout', pages.logout);
app.get('/delete', users.delete);
app.get('/update', users.update);
app.post('/update', users.update);
app.get('/nic/update', users.nic);
app.get('/status.json', users.status);

module.exports = app;
