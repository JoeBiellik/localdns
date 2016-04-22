var config = require('config');
var wrap = require('co-express');
var dns = require('dns');
var http = require('http');
var auth = require('http-auth');
var ping = require ('net-ping');
var User = require('../models/user');
var pages = require('./page');

var users = {};

users.setSession = function(req, user) {
	if (user) {
		req.session.user = {
			username: user.username,
			sub: user.sub,
			ip: user.ip
		};
	} else {
		req.session.user = {};
	}
};

users.checkSession = function(req) {
	return new Promise((resolve, reject) => {
		if (!Boolean(req.session.user) || !Boolean(req.session.user.username)) return reject();

		User.findOne({ username: req.session.user.username }, (err, doc) => {
			if (!err && doc) {
				return resolve(doc);
			} else {
				return reject();
			}
		});
	});
};

users.getUser = function(username, password) {
	return new Promise((resolve, reject) => {
		if (!Boolean(username) || !Boolean(password)) return reject();

		User.findOne({ username: username }, (err, doc) => {
			if (!err && doc && doc.verifyPasswordSync(password)) {
				return resolve(doc);
			} else {
				return reject();
			}
		});
	});
};

users.parseErrors = function(err) {
	errors = {};

	if (!err.errors) return errors;

	if (err.errors.ip) {
		errors.ip = 'Invalid IPv4 address';
	}

	if (err.errors.sub) {
		if (err.errors.sub.message == 'unique') {
			errors.sub = 'Subdomain "' + err.errors.sub.value + '" is already taken';
		} else {
			errors.sub = 'Invalid subdomain';
		}
	}

	if (err.errors.username) {
		if (err.errors.username.message == 'unique') {
			errors.username = 'Username "' + err.errors.username.value + '" is already in use';
		} else {
			errors.username = 'Invalid username';
		}
	}

	if (err.errors.password) {
		if (err.errors.password.message == 'match') {
			errors.password = 'Passwords do not match';
		} else {
			errors.password = 'Password must be at least 8 characters long';
		}
	}

	return errors;
}

users.register = wrap(function*(req, res) {
	try {
		res.locals.body = {
			username: req.body.username,
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
			username: req.body.username,
			sub: req.body.sub,
			ip: res.locals.ip,
			password: req.body.password
		});

		yield user.save();

		users.setSession(req, user);

		return res.redirect('/');
	} catch (err) {
		res.locals.errors = users.parseErrors(err);
		return pages.register(req, res);
	}
});

users.login = wrap(function* (req, res) {
	try {
		var user = yield users.getUser(req.body.username, req.body.password);

		users.setSession(req, user);

		return res.redirect('/');
	} catch (err) {
		res.locals.errors = { _top: 'Username and password did not match' };
		pages.login(req, res);
	}
});

users.edit = wrap(function* (req, res) {
	if (!req.body) return res.redirect('/');

	var user;

	try {
		user = yield users.checkSession(req);
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
		if (req.body.username && req.body.username != user.username) user.username = req.body.username;
		if (req.body.password) user.password = req.body.password;

		yield user.save();

		users.setSession(req, user);

		return res.redirect('/');
	} catch (err) {
		res.locals.errors = users.parseErrors(err);
		return pages.home(req, res);
	}
});

users.basicAuth = function(req, res) {
	var basic = auth.basic({ realm: 'Login Required' }, function (username, password, callback) {
		User.findOne({ username: decodeURIComponent(username) }, function (err, doc) {
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
		if (req.body.username && req.body.password) {
			try {
				var user = yield users.getUser(req.body.username, req.body.password);

				user.ip = req.body.ip || res.locals.ip;
				user.save();

				res.sendStatus(204);
				return res.end();
			} catch (err) {
				res.sendStatus(403);
				return res.end();
			}
		} else {
			try {
				var user = yield users.basicAuth(req, res);

				User.findOne({ username: user }, function (err, doc) {
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
		}
	} else {
		var user = yield users.getUser(req, false);
		user.ip = req.body.ip || res.locals.ip;
		user.save();

		users.setSession(req, user);

		return res.redirect('/');
	}
});

users.nic = wrap(function* (req, res) {
	try {
		var user = yield users.basicAuth(req, res);
		var ip = req.query.myip || res.locals.ip;

		User.findOne({ username: decodeURIComponent(user) }, function (err, doc) {
			if (req.query && req.query.hostname) {
				if (doc.sub + '.' + config.domain != req.query.hostname) {
					res.send('nohost');
					return res.end();
				} else {
					if (doc.ip == ip) {
						res.send('nochg ' + doc.ip);
						return res.end();
					} else {
						doc.ip = ip;
						doc.save();
						res.send('good ' + doc.ip);
						return res.end();
					}
				}
			} else {
				res.sendStatus(401);
				return res.end();
			}
		});
	} catch (err) {
		res.send('badauth');
		return res.end();
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

		ping.createSession({ retries: 0, timeout: 1000 }).pingHost(req.session.user.ip, function(error) {
			if (!error) {
				result.ping.error = false;
			}

			var request = http.get({
				hostname: req.session.user.ip,
				port: 80,
				path: '/',
				agent: false,
				headers: {
					host: req.session.user.sub + '.' + config.domain
				}
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

			request.setTimeout(1000);
		});
	});
};

module.exports = users;
