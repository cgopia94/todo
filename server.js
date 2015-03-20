var express 				= require('express');
var app 						= express();
var mongoose				= require('mongoose');
var morgan					= require('morgan');
var bodyParser			= require('body-parser');
var methodOverride	= require('method-override');
var db 							= require('./config/db');
var port 						= process.env.PORT || 8080;

app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({type: 'application/vnd.api+json'}));
app.use(methodOverride());

require('./app/routes.js')(app);

mongoose.connect(db.url, function(err) {
	console.log('DB connected!');
});

app.listen(port);
console.log("App listening on port " + port);