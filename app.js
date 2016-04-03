var express = require('express');
var app = express();

app.set('view engine', 'jade');
app.use(express.static('public'));

app.get('/', function (req, res) {
	res.render('index', { title: 'Test', text: 'Hello World!'});
});

module.exports = app;
