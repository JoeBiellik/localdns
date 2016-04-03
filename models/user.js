var mongoose = require('mongoose');

var user = new mongoose.Schema({
	_id: { type: String, unique: true },
	paste: { type: String },
	expiresAt: { type: Date, expires: 0, default: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) }
}, {
	timestamps: true
});

module.exports = mongoose.model('User', user);
