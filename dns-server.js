var util = require('util');
var config = require('config');
var dnsd = require('dnsd');
var db = require('./db')();
var User = require('./models/user');

var typeA = function (res, name) {

};

var server = dnsd.createServer(function(req, res) {
	var question = res.question && res.question[0];

	// Only allow A record requests
	// if (question.type != 'A') {
	// 	res.responseCode = 5;
	// 	return res.end();
	// }

	console.log('A lookup for domain: %s', question.name);

	// var u = new User({
	// 	email: 'mat.lomax@gmail.com',
	// 	sub: 'mat',
	// 	ip: '2.4.6.8',
	// 	password: 'password'
	// });
	//
	// u.save();

	if (question.name !== config.domain && !question.name.endsWith('.' + config.domain)) {
		res.responseCode = 5; // Refused
		return res.end();
	}

	if (question.name === config.domain || question.name === 'www.' + config.domain) {
		switch (question.type) {
			case 'A':
				res.answer.push({ 'name': question.name, 'type': 'A', 'data': config.ip });
				break;
			case 'NS':
				res.answer.push({ 'name': question.name, 'type': 'NS', 'data': 'ns1.' + config.domain });
				break;
			case 'CNAME':
				res.answer.push({ 'name': question.name, 'type': 'CNAME', 'data': config.domain });
				res.answer.push({ 'name': question.name, 'type': 'A', 'data': config.ip });
				break;
			default:
				res.answer.push({ 'name': question.name, 'type': 'NS', 'data': 'ns1.' + config.domain });
				res.answer.push({ 'name': question.name, 'type': 'CNAME', 'data': config.domain });
				res.answer.push({ 'name': question.name, 'type': 'A', 'data': config.ip });
		}

		return res.end();
	}

	try {
		var user = User.findOne({ sub: question.name.substring(0, question.name.lastIndexOf('.' + config.domain)) }, function (err, doc) {
			if (!err && doc) {
				switch (question.type) {
					case 'A':
						res.answer.push({ 'name': question.name, 'type': 'A', 'data': config.ip });
						break;
					case 'NS':
						res.answer.push({ 'name': question.name, 'type': 'NS', 'data': 'ns1.' + config.domain });
						break;
					default:
						res.answer.push({ 'name': question.name, 'type': 'NS', 'data': 'ns1.' + config.domain });
						res.answer.push({ 'name': question.name, 'type': 'A', 'data': config.ip });
				}
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
