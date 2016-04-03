var util = require('util');
var config = require('config');
var dnsd = require('dnsd');
var User = require('./models/user');

var server = dnsd.createServer(function(req, res) {
	var question = res.question && res.question[0];

	// Only allow A record requests
	if (question.type != 'A') return res.end();

	console.log('A lookup for domain: %s', question.name);

	res.answer.push({'name': question.name, 'type': 'A', 'data': '1.2.3.4'});
	res.answer.push({'name': question.name, 'type': 'A', 'data': '2.3.4.5'});

	return res.end();
});

server.listen(process.env.PORT || config.dns.port, process.env.HOST || config.dns.host);
