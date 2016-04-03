var mongoose = require('mongoose');

var user = new mongoose.Schema({
	name: { type: String },
	sub: { type: String },
	ip: { type: String }
}, {
	timestamps: true
});

user.plugin(require('mongoose-bcrypt'));

module.exports = mongoose.model('User', user);
