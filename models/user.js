var mongoose = require('mongoose');

var user = new mongoose.Schema({
	email: { type: String, unique: true },
	sub: { type: String, unique: true },
	ip: { type: String }
}, {
	timestamps: true
});

user.plugin(require('mongoose-bcrypt'));

module.exports = mongoose.model('User', user);
