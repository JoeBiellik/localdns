const mongoose = require('mongoose');
const config = require('config');
const cidr = require('cidr_match');

const user = new mongoose.Schema({
	username: {
		type: String,
		unique: true,
		validate: (value) => {
			return /^[a-z0-9][a-z0-9_-]{0,62}$/.test(value);
		}
	},
	sub: {
		type: String,
		unique: true,
		validate: (value) => {
			if (!/^[a-z0-9_][a-z0-9_-]{0,61}[a-z0-9_]$/.test(value)) return false;

			if (!config.subdomainBlacklist) return true;

			for (const key in config.subdomainBlacklist) {
				if (value == config.subdomainBlacklist[key]) {
					return false;
				}
			}

			return true;
		}
	},
	ip: {
		type: String,
		validate: (value) => {
			if (!/^(?:(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)\.){3}(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)$/.test(value)) return false;
			if (!config.ipRangeBlacklist) return true;

			for (const key in config.ipRangeBlacklist) {
				if (cidr.cidr_match(value, config.ipRangeBlacklist[key])) {
					return false;
				}
			}

			return true;
		}
	},
	password: {
		type: String,
		required: true,
		bcrypt: true,
		minlength: 8
	}
}, {
	timestamps: true
});

user.plugin(require('mongoose-unique-validator'), { message: 'unique' });
user.plugin(require('mongoose-bcrypt'));

module.exports = mongoose.model('User', user);
