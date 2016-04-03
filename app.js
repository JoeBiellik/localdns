var express = require('express');
var auth = require('http-auth');
var app = express();

var authMiddleware = auth.connect(auth.basic({
	realm: 'SUPER SECRET STUFF'
}, function (username, password, callback) {
	callback(username == 'admin' && password == 'password');
}));

app.set('view engine', 'jade');
app.use(express.static('public'));
app.enable('trust proxy');

app.get('/', function (req, res) {
	res.render('index', { title: 'Test', text: 'Hello World!'});
});

app.get('/secret', authMiddleware, function (req, res) {
    res.send('Authenticated');
});

module.exports = app;
