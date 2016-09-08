var config = require('config');
var util = require('util');
var app = require('./app');

module.exports = app.listen(process.env.PORT || config.port || 80, function() {
	util.log('Server started: http://%s:%s/', this.address().address, this.address().port);
});
