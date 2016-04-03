var util = require('util');
var config = require('config');
var dnsd = require('dnsd');
var db = require('./db')();
var User = require('./models/user');

var server = dnsd.createServer(function(req, res) {
	var question = res.question && res.question[0];

	// Only allow A record requests
	if (question.type != 'A') return res.end();

	console.log('A lookup for domain: %s', question.name);

	// var u = new User({
	// 	email: 'mat.lomax@gmail.com',
	// 	sub: 'mat',
	// 	ip: '2.4.6.8',
	// 	password: 'password'
	// });
	//
	// u.save();

	if (!question.name.endsWith('.' + config.domain)) {
		res.responseCode = 5;
		return res.end();
	}

	try {
		var user = User.findOne({ sub: question.name.substring(0, question.name.lastIndexOf('.' + config.domain)) }, function (err, doc) {
			if (!err && doc) {
				res.answer.push({ 'name': question.name, 'type': 'A', 'data': doc.ip });
			} else {
				res.responseCode = 3;
			}
			return res.end();
		});
	} catch (ex) {
		return res.end();
	}
});

server.zone(config.domain, 'ns1.' + config.domain, 'us@' + config.domain, 'now', '2h', '30m', '2w', '1m').listen(process.env.PORT || config.dns.port, process.env.HOST || config.dns.host);
