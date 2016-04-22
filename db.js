var config = require('config');
var mongoose = require('mongoose');

module.exports = function () {
	mongoose.connect(config.db);

	mongoose.connection.once('open', function () {
		console.log('MongoDB connection open');
	});

	mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

	return mongoose.connection;
}
