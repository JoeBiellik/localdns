var config = require('config');
var wrap = require('co-express');
var dns = require('dns');
var http = require('http');
var auth = require('http-auth');
var ping = require ('net-ping');
var User = require('../models/user');
var validator = require('email-validator');

var users = {};

users.setSession = function(req, user) {
	req.session.user = {
		email: user.email,
		sub: user.sub,
		ip: user.ip
	};
};

users.checkSession = function(req) {
	return (Boolean(req.session.user) && Boolean(req.session.user.email) && req.session.loggedIn);
};

users.getSessionUser = function(req) {
	return new Promise((resolve, reject) => {
		if (!users.checkSession(req)) return reject();

		User.findOne({ email: req.session.user.email }, (err, doc) => {
			if (!err && doc) {
				return resolve(doc);
			} else {
				return reject();
			}
		});
	});
};

users.getUser = function(req, verify) {
	return new Promise((resolve, reject) => {
		var email = users.checkSession(req) ? req.session.user.email : req.body.email;

		if (verify && (!req.body.email || !req.body.password)) return reject();

		User.findOne({ email: email }, function (err, doc) {
			if (!err && doc && (!verify || users.checkSession(req) || doc.verifyPasswordSync(req.body.password))) {
				console.log('resolve');
				return resolve(doc);
			} else {
				console.log('reject');
				console.log(err);
				console.log(doc);
				console.log(verify);
				return reject();
			}
		});
	});
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
					sub: req.body.sub
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
	if (users.checkSession(req)) return res.redirect('/');

	res.render('register', { title: 'Register' });
};

users.loginPost = wrap(function* (req, res) {
	try {
		var user = yield users.getUser(req, false);

		req.session.loggedIn = true;
		users.setSession(req, user);

		res.redirect('/');
	} catch (err) {
		res.locals.errors = { _top: 'Email and password did not match' };
		users.login(req, res);
	}
});

users.login = function(req, res) {
	if (users.checkSession(req)) return res.redirect('/');

	res.render('login', { title: 'Login' });
};

users.logout = function(req, res) {
	req.session.loggedIn = false;
	req.session.user = null;

	res.redirect('/');
};

users.basicAuth = finction(req, res) {
	var basic = auth.basic({ realm: 'Login Required' }, function (username, password, callback) {
		User.findOne({ email: username }, function (err, doc) {
			callback(!err && doc && doc.verifyPasswordSync(password));
		});
	});

	return new Promise((resolve, reject) => {
		basic.check(req, res, function(reqAuth) {
			if (!reqAuth.user) {
				return reject();
			}

			return resolve(reqAuth.user);
		});
	});
}

users.update = wrap(function* (req, res) {
	var check = users.checkSession(req);

	if (!check) {
		try {
			var user = yield users.basicAuth(req, res);

			User.findOne({ email: user }, function (err, doc) {
				doc.ip = req.body.ip || res.locals.ip;
				doc.save();

				// TODO: Validation

				res.sendStatus(204);
				return res.end();
			});
		} catch (err) {
			res.sendStatus(403);
			return res.end();
		}
	} else {
		users.getUser(req, false, function (err, user)  {
			if (err || !user) {
				res.sendStatus(403);
				return res.end();
			}

			// TODO: Validation

			user.ip = req.body.ip || res.locals.ip;
			user.save();
			users.setSession(req, user);

			return res.redirect('/');
		});
	}
});

users.status = function(req, res) {
	var check = users.checkSession(req);

	res.set('Cache-Control', 'no-cache');

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
		if (!err && addresses.length > 0) {
			result.dns = {
				error: false,
				result: addresses[0]
			};
		} else {
			result.dns = {
				error: true,
				result: ''
			};
		}

		ping.createSession({ retries: 0, timeout: 1000 }).pingHost((result.dns.error || result.dns.result != req.session.user.ip) ? req.session.user.ip : req.session.user.sub + '.' + config.domain, function(error) {
			if (!error) {
				result.ping.error = false;
			}

			var request = http.get({
				hostname: (result.dns.error || result.dns.result != req.session.user.ip) ? req.session.user.ip : req.session.user.sub + '.' + config.domain,
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
			}).on('error', () => {
				res.json(result);
				return res.end();
			});

			request.setTimeout(1000, function() {
				res.json(result);
				return res.end();
			});
		});
	});
};

module.exports = users;
