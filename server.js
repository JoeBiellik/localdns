var app = require('./app');
var config = require('config');

module.exports = app.listen(process.env.PORT || config.port || 80, function() {
	console.log('Server started: http://%s:%s/', this.address().address, this.address().port);
});
