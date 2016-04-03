var util = require('util');
var config = require('config');
var dnsd = require('dnsd');
var User = require('./models/user');

var server = dnsd.createServer(function(req, res) {
	res.end('1.2.3.4');
});

server.listen(process.env.PORT || config.dns.port, process.env.HOST || config.dns.host);
