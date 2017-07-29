const pages = {};

pages.home = function(req, res) {
	res.render('index', { title: 'Dynamic DNS Service' });
};

pages.register = function(req, res) {
	if (res.locals.loggedIn) return res.redirect('/');

	res.render('register', { title: 'Register' });
};

pages.login = function(req, res) {
	if (res.locals.loggedIn) return res.redirect('/');

	res.render('login', { title: 'Login' });
};

pages.logout = function(req, res) {
	req.session.loggedIn = false;
	require('./user').setSession(req);

	res.redirect('/');
};

pages.about = function(req, res) {
	res.render('about', { title: 'About' });
};

module.exports = pages;
