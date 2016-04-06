var config = require('config');
var dns = require('dns');
var http = require('http');
var ping = require ("net-ping");
var db = require('../db')();
var User = require('../models/user');
var validator = require('email-validator');

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
	var errors = {};

	if (req.body.password !== req.body.password_confirm) {
		errors.password_confirm = 'Passwords do not match';
	}

	if (req.body.password.length < 8) {
		errors.password = 'Must be at least 8 characters';
	}

	if (!req.body.sub.match(/^[a-z0-9_][a-z0-9_-]{0,61}[a-z0-9_]$/)) {
		errors.sub = '2 to 63 characters; lowercase letters, numbers, dashes (-) and underscores (_). May not start with a dash.';
	}

	if (!validator.validate(req.body.email)) {
		errors.email = 'Invalid email address';
	}

	User.count({ email: req.body.email }, function (err, count) {
		if (!err && count) {
			errors.email = 'Email address already in use';
		}

		User.count({ sub: req.body.sub }, function (err, count) {
			if (!err && count) {
				errors.sub = 'Subdomain already in use';
			}

			if (Object.keys(errors).length) {
				res.locals.body = {
					email: req.body.email,
					sub: req.body.sub,
				};
				res.locals.errors = errors;
				return users.register(req, res);
			} else {
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
			}
		});
	});
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

users.status = function(req, res) {
	var check = users.checkSession(req);

	if (!check) {
		res.sendStatus(403);
		return res.end();
	}

	var result = {
		dns: {
			error: true
		},
		ping: {
			error: true
		},
		http: {
			error: true
		}
	};

	dns.setServers(['8.8.8.8', '8.8.4.4']);
	dns.resolve4(req.session.user.sub + '.' + config.domain, (err, addresses) => {
		if (!err) {
			result.dns = {
				error: false,
				result: addresses
			};
		}

		ping.createSession({ retries: 0, timeout: 1000 }).pingHost(req.session.user.ip, function(error, target) {
			if (!error) {
				result.ping.error = false;

				var request = http.get({
					hostname: req.session.user.sub + '.' + config.domain, //req.session.user.ip,
					port: 80,
					path: '/',
					agent: false
				}, (httpRes) => {
					result.http = {
						error: false,
						result: httpRes.statusCode
					};

					res.json(result);
					return res.end();
				});

				request.setTimeout(1000, function() {
					res.json(result);
					return res.end();
				});
			}
		});
	});
};

module.exports = users;
