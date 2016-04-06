var users = require('./user');
var db = require('../db')();
var User = require('../models/user');
var validator = require('email-validator');

var pages = {};

var validateEmail = function(email, callback) {
	if (!email) {
		callback(false);
		return;
	}

	if (!validator.validate(email)) {
		callback(true, 'Invalid email address');
		return;
	}

	User.count({ email: email }, function (err, count) {
		if (!err && count) {
			callback(true, 'Email address already in use' );
		} else {
			callback(false);
		}
	});
}

var validateSub = function(sub, callback) {
	if (!sub) {
		callback(false);
		return;
	}

	if (!sub.match(/^[a-z0-9_][a-z0-9_-]{0,61}[a-z0-9_]$/)) {
		callback(true, '2 to 63 characters; lowercase letters, numbers, dashes (-) and underscores (_). May not start with a dash.');
		return;
	}

	User.count({ sub: sub }, function (err, count) {
		if (!err && count) {
			callback(true, 'Subdomain already in use');
		} else {
			callback(false);
		}
	});
}

pages.home = function(req, res) {
	res.render('index', { title: 'Dynamic DNS Service' });
};

pages.homePost = function(req, res) {
	var errors = {};
	res.locals.body = {};

	if (req.body.ip) {
		var matcher = /^(?:(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)\.){3}(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)$/;

		if (!req.body.ip.match(matcher)) {
			errors.ip = 'Invalid IP address';
			res.locals.body.ip = req.body.ip;
		}
	}

	validateSub(req.body && req.body.sub, function(err, message) {
		if (err) {
			errors.sub = message;
			res.locals.body.sub = req.body.sub;
		}

		validateEmail(req.body && req.body.email, function(err, message) {
			if (err) {
				errors.email = message;
				res.locals.body.email = req.body.email;
			}

			if (req.body.password || req.body.password_confirm) {
				if (req.body.password !== req.body.password_confirm) {
					errors.password_confirm = 'Passwords do not match';
				}

				if (req.body.password.length < 8) {
					errors.password = 'Must be at least 8 characters';
				}
			}

			if (Object.keys(errors).length) {
				res.locals.errors = errors;
				return pages.home(req, res);
			}

			users.getUser(req, false, function (err, u)  {
				if (err || !u) {
					res.locals.errors = { _top: 'User not found' };
					return pages.home(req, res);
				}

				if (req.body.ip) u.ip = req.body.ip;
				if (req.body.sub) u.sub = req.body.sub;
				if (req.body.email) u.email = req.body.email;
				if (req.body.password) u.password = req.body.password;
				u.save();

				users.setSession(req, u);

				return res.redirect('/');
			});
		});
	});
};

pages.about = function(req, res) {
	res.render('about', { title: 'About' });
}

module.exports = pages;
