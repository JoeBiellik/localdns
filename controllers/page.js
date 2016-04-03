module.exports = {
	home(req, res) {
		res.render('index', { title: 'Dynamic DNS Service' });
	},
	about(req, res) {
		res.render('about', { title: 'About' });
	}
};
