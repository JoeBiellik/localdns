var db = require('../db')();
var User = require('../models/user');

module.exports = {
	register(req, res) {
		res.render('register', { title: 'Register' });
	},
	login(req, res) {
		res.render('login', { title: 'Login' });
	},
	update(req, res) {
		var email = req.session.email;
	    if (!res.locals.loggedIn) {
			if (req.body.email) {
				email = req.body.email;
			} else {
				res.sendStatus(403);
				return res.end();
			}
		}

		var user = User.findOne({ email: email }, function (err, doc) {
			if (!err && doc) {
				if (res.locals.loggedIn || doc.verifyPasswordSync(req.body.password)) {
					doc.ip = req.body.ip || res.locals.ip;
					doc.save();
					res.sendStatus(204);
				} else {
					res.sendStatus(403);
				}
			} else {
				res.sendStatus(404);
			}

			return res.end();
		});
	}
};
