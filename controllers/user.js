var config = require('config');
var wrap = require('co-express');
var dns = require('dns');
var http = require('http');
var auth = require('http-auth');
var ping = require ('net-ping');
var User = require('../models/user');
var validator = require('email-validator');
var pages = require('./page');

var users = {};

users.setSession = function(req, user) {
	if (user) {
		req.session.user = {
			email: user.email,
			sub: user.sub,
			ip: user.ip
		};
	} else {
		req.session.user = {};
	}
};

users.checkSession = function(req) {
	return new Promise((resolve, reject) => {
		if (!Boolean(req.session.user) || !Boolean(req.session.user.email)) return reject();

		User.findOne({ email: req.session.user.email }, (err, doc) => {
			if (!err && doc) {
				return resolve(doc);
			} else {
				return reject();
			}
		});
	});
};

users.getUser = function(email, password) {
	return new Promise((resolve, reject) => {
		if (!Boolean(email) || !Boolean(password)) return reject();

		User.findOne({ email: req.session.user.email }, (err, doc) => {
			if (!err && doc && doc.verifyPasswordSync(password)) {
				return resolve(doc);
			} else {
				return reject();
			}
		});
	});
};

users.register = wrap(function*(req, res) {
	try {
		res.locals.body = {
			email: req.body.email,
			sub: req.body.sub
		};

		if (req.body.password || req.body.password_confirm) {
			if (req.body.password != req.body.password_confirm) throw {
				message: 'User validation failed',
				name: 'ValidationError',
				errors: {
					password: {
						message: 'match'
					}
				}
			};
		}

		var user = new User({
			email: req.body.email,
			sub: req.body.sub,
			ip: res.locals.ip,
			password: req.body.password
		});

		yield user.save();

		users.setSession(req, user);

		return res.redirect('/');
	} catch (err) {
		console.log(err);

		res.locals.errors = {};

		if (err.errors.sub) {
			if (err.errors.sub.message == 'unique') {
				res.locals.errors.sub = 'Subdomain "' + err.errors.sub.value + '" is already taken';
			} else {
				res.locals.errors.sub = 'Invalid subdomain';
			}
		}

		if (err.errors.email) {
			if (err.errors.email.message == 'unique') {
				res.locals.errors.email = 'Email address "' + err.errors.email.value + '" is already in use';
			} else {
				res.locals.errors.email = 'Invalid email address';
			}
		}

		if (err.errors.password) {
			if (err.errors.password.message == 'match') {
				res.locals.errors.password = 'Passwords do not match';
			} else {
				res.locals.errors.password = 'Password must be at least 6 characters long';
			}
		}

		return pages.register(req, res);
	}
});

users.login = wrap(function* (req, res) {
	try {
		var user = yield users.getUser(req.body.email, req.body.password);

		users.setSession(req, user);

		return res.redirect('/');
	} catch (err) {
		res.locals.errors = { _top: 'Email and password did not match' };
		pages.login(req, res);
	}
});

users.edit = wrap(function* (req, res) {
	if (!req.body) return res.redirect('/');

	var user;

	try {
		user = yield users.getSessionUser(req);
	} catch (err) {
		return res.redirect('/');
	}

	try {
		if (req.body.password || req.body.password_confirm) {
			if (req.body.password != req.body.password_confirm) throw {
				message: 'User validation failed',
				name: 'ValidationError',
				errors: {
					password: {
						message: 'match'
					}
				}
			};
		}

		if (req.body.ip && req.body.ip != user.ip) user.ip = req.body.ip;
		if (req.body.sub && req.body.sub != user.sub) user.sub = req.body.sub;
		if (req.body.email && req.body.email != user.email) user.email = req.body.email;
		if (req.body.password) user.password = req.body.password;

		yield user.save();

		users.setSession(req, user);

		return res.redirect('/');
	} catch (err) {
		// console.log(err);

		res.locals.errors = {};

		if (err.errors.ip) {
			res.locals.errors.email = 'Invalid IP address';
		}

		if (err.errors.sub) {
			if (err.errors.sub.message == 'unique') {
				res.locals.errors.sub = 'Subdomain "' + err.errors.sub.value + '" is already taken';
			} else {
				res.locals.errors.sub = 'Invalid subdomain';
			}
		}

		if (err.errors.email) {
			if (err.errors.email.message == 'unique') {
				res.locals.errors.email = 'Email address "' + err.errors.email.value + '" is already in use';
			} else {
				res.locals.errors.email = 'Invalid email address';
			}
		}

		if (err.errors.password) {
			if (err.errors.password.message == 'match') {
				res.locals.errors.password = 'Passwords do not match';
			} else {
				res.locals.errors.password = 'Password must be at least 6 characters long';
			}
		}

		return pages.home(req, res);
	}
});

users.basicAuth = function(req, res) {
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
		var user = yield users.getUser(req, false);
		user.ip = req.body.ip || res.locals.ip;
		user.save();

		users.setSession(req, user);

		return res.redirect('/');
	}
});

users.status = function(req, res) {
	res.set('Cache-Control', 'no-cache');

	if (!users.checkSession(req)) {
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

				clearTimeout(timeout);
				res.json(result);
				return res.end();
			}).on('error', () => {
				clearTimeout(timeout);
				res.json(result);
				return res.end();
			});

			var timeout = request.setTimeout(1000, () => {
				res.json(result);
				return res.end();
			});
		});
	});
};

module.exports = users;
