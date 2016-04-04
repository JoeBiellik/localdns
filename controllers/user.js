var db = require('../db')();
var User = require('../models/user');

var users = {};

users.checkSession = function(req) {
	return (Boolean(req.session.user) && Boolean(req.session.user.email) && req.session.loggedIn);
};

users.getUser = function(req, verify, callback) {
	var email = users.checkSession(req) ? req.session.user.email : req.body.email;
	if (verify && (!req.body.email || !req.body.password)) callback(true);

	User.findOne({ email: email }, function (err, doc) {
		if (!err && doc && (!verify || users.checkSession(req) || doc.verifyPasswordSync(req.body.password))) {
			callback(false, doc);
		} else {
			callback(true);
		}
	});
};

users.setSession = function(req, u) {
	if (!u) return;

	req.session.user = {
		email: u.email,
		sub: u.sub,
		ip: u.ip
	};
};

users.registerPost = function(req, res) {
	var u = new User({
		email: req.body.email,
		sub: req.body.sub,
		ip: res.locals.ip,
		password: req.body.password
	});

	u.save();

	req.session.loggedIn = true;
	users.setSession(req, u);

	return res.redirect('/');
};

users.register = function(req, res) {
	res.render('register', { title: 'Register' });
};

users.loginPost = function(req, res) {
	users.getUser(req, true, function (err, u) {
		if (!err && u) {
			req.session.loggedIn = true;
			users.setSession(req, u);

			return res.redirect('/');
		} else {
			res.locals.errors = { _top: 'Email and password did not match' };
			users.login(req, res);
		}
	});
}

users.login = function(req, res) {
	if (users.checkSession(req)) {
		return res.redirect('/');
	} else {
		res.render('login', { title: 'Login' });
	}
};

users.logout = function(req, res) {
	req.session.loggedIn = false;
	req.session.user = null;

	return res.redirect('/');
};

users.update = function(req, res) {
	var check = users.checkSession(req);
	var email = check ? req.session.user.email : req.body.email;

	if (!email) {
		res.status(401);
		return res.send('Invalid email address');
	}

	var ip = req.body.ip || res.locals.ip;
	var matcher = /^(?:(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)\.){3}(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)$/;

	if (!ip.match(matcher)) {
		res.status(401);
		return res.send('Invalid IP address');
	}

	users.getUser(req, false, function (err, u)  {
		if (err || !u) {
			res.sendStatus(403);
			return res.end();
		}

		u.ip = req.body.ip || res.locals.ip;
		u.save();

		users.setSession(req, u);

		if (check) {
			return res.redirect('/');
		} else {
			res.sendStatus(204);
			return res.end();
		}
	});
};

module.exports = users;
