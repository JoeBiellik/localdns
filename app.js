var express = require('express');
var auth = require('http-auth');
var app = express();

var authMiddleware = auth.connect(auth.basic({
	realm: 'SUPER SECRET STUFF'
}, function (username, password, callback) {
	callback(username == 'admin' && password == 'password');
}));

app.enable('trust proxy');
app.locals.pretty = true;
app.set('view engine', 'jade');
app.use(express.static('public'));

app.get('/', function (req, res) {
	res.render('index', { title: 'localdns.in'});
});

app.get('/secret', authMiddleware, function (req, res) {
    res.send('Authenticated');
});

module.exports = app;
