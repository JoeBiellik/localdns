var mongoose = require('mongoose');

var user = new mongoose.Schema({
	name: { type: String, unique: true },
	sub: { type: String, unique: true },
	ip: { type: String, unique: true }
}, {
	timestamps: true
});

user.plugin(require('mongoose-bcrypt'));

module.exports = mongoose.model('User', user);
