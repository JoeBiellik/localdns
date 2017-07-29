const config = require('config');
const util = require('util');
const dnsd = require('dnsd');
const User = require('./models/user');
require('./db')();

const server = dnsd.createServer((req, res) => {
	const question = res.question && res.question[0];
	question.name = question.name.toLowerCase() || '';

	util.log('[%s] %s request', question.name, question.type);

	if (question.name !== config.domain && !question.name.endsWith('.' + config.domain)) {
		res.responseCode = 5; // REFUSED
		return res.end();
	}

	config.dns.records.forEach((record) => {
		if (record.name && record.type === 'NS') {
			return;
		}

		const name = record.name ? record.name + '.' + config.domain : config.domain;
		if (name !== question.name) return;

		if (question.type === '*' || record.type === question.type) {
			res.answer.push({ 'name': name, 'type': record.type, 'data': record.data });
		}
	});

	if (res.answer.length || question.type === 'SOA') return res.end();

	let sub = question.name.substring(0, question.name.lastIndexOf('.' + config.domain));
	if (sub.lastIndexOf('.') !== -1) sub = sub.substring(sub.lastIndexOf('.') + 1);

	try {
		User.findOne({ sub: sub }, (err, doc) => {
			if (!err && doc) {
				if (question.type == 'A' || question.type == '*') {
					res.answer.push({ 'name': question.name, 'type': 'A', 'data': doc.ip });
				}
			} else {
				res.responseCode = 3; // NXDOMAIN
			}

			return res.end();
		});
	} catch (ex) {
		res.responseCode = 2; // SERVFAIL
		return res.end();
	}
});

server
	.zone(config.domain, 'ns1.' + config.domain, config.contact || 'contact@' + config.domain, 'now', '2h', '30m', '2w', '1m')
	.listen(process.env.PORT || config.dns.port || 53, process.env.HOST || config.dns.host || '0.0.0.0');
