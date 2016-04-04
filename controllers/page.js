var users = require('./user');

var pages = {};

pages.home = function(req, res) {
	res.render('index', { title: 'Dynamic DNS Service' });
};

pages.homePost = function(req, res) {
	var matcher = /^(?:(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)\.){3}(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)$/;

	if (!req.body.ip.match(matcher)) {
		res.locals.errors = { ip: 'Invalid IP address' };
		return pages.home(req, res);
	}

	users.getUser(req, false, function (err, u)  {
		if (err || !u) {
			res.locals.errors = { _top: 'User not found' };
			return pages.home(req, res);
		}

		u.ip = req.body.ip;
		u.save();

		users.setSession(req, u);

		return res.redirect('/');
	});
};

pages.about = function(req, res) {
	res.render('about', { title: 'About' });
}

module.exports = pages;
