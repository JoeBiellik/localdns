const config = require('config');
const util = require('util');
const app = require('./app');

module.exports = app.listen(process.env.PORT || config.port || 80, function() {
	util.log('Server started: http://%s:%s/', this.address().address, this.address().port);
});
