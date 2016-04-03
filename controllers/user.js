module.exports = {
	register(req, res) {
		res.render('register', { title: 'Register' });
	},
	login(req, res) {
		res.render('login', { title: 'Login' });
	}
};
