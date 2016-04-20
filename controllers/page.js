var wrap = require('co-express');
var config = require('config');
var users = require('./user');

exports.home = function(req, res) {
	res.render('index', { title: 'Dynamic DNS Service' });
};

exports.homePost = wrap(function* (req, res) {
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

		return exports.home(req, res);
	}
});

exports.about = function(req, res) {
	res.render('about', { title: 'About' });
}
