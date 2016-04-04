var db = require('../db')();
var User = require('../models/user');

var user = {};

user.checkSession = function(req) {
	return (Boolean(req.session.user.email) && req.session.loggedIn);
};

user.getUser = function(req, verify, callback) {
	var email = user.checkSession(req) ? req.session.user.email : req.body.email;
	if (verify && (!req.body.email || !req.body.password)) callback(true);

	User.findOne({ email: email }, function (err, doc) {
		if (!err && doc && (!verify || user.checkSession(req) || doc.verifyPasswordSync(req.body.password))) {
			callback(false, doc);
		} else {
			callback(true);
		}
	});
};

user.setSession = function(req, u) {
	req.session.user = {
		email: u.email,
		sub: u.sub,
		ip: u.ip
	};
};

user.register = function(req, res) {
	res.render('register', { title: 'Register' });
};

user.loginPost = function(req, res) {
	user.getUser(req, true, function (err, u) {
		if (!err && u) {
			req.session.loggedIn = true;
			user.setSession(req, u);

			return res.redirect('/');
		} else {
			res.locals.errors = [ 'Email and password did not match' ];
			return res.redirect('/login');
		}
	});
}

user.login = function(req, res) {
	if (user.checkSession(req)) {
		return res.redirect('/');
	} else {
		res.render('login', { title: 'Login' });
	}
};

user.update = function(req, res) {
	var email = user.checkSession(req) ? req.session.user.email : req.body.email;

	if (!email) {
		res.sendStatus(401);
		return res.end();
	}

	user.getUser(req, false, function (err, u)  {
		if (err || !u) {
			res.sendStatus(403);
			return res.end();
		}

		u.ip = req.body.ip || res.locals.ip;
		u.save();

		user.setSession(req, u);

		if (user.checkSession(req)) {
			return res.redirect('/');
		} else {
			res.sendStatus(204);
			return res.end();
		}
	});
};

module.exports = user;
