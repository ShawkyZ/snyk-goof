/**
 * Module dependencies.
 */

const snyk = require('@snyk/nodejs-runtime-agent')
snyk({
  projectId: process.env.SNYK_PROJECT_ID,
});

// mongoose setup
require('./db');

var st = require('st');
var crypto = require('crypto');
var express = require('express');
var https = require('https');
var path = require('path');
var ejsEngine = require('ejs-locals');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var optional = require('optional');
var marked = require('marked');
var fileUpload = require('express-fileupload');
var dust = require('dustjs-linkedin');
var dustHelpers = require('dustjs-helpers');
var cons = require('consolidate');
var csurf = require('csurf');
var rateLimit = require('express-rate-limit');

var app = express();
var routes = require('./routes');

app.disable('x-powered-by');

// all environments
app.set('port', process.env.PORT || 3001);
app.engine('ejs', ejsEngine);
app.engine('dust', cons.dust);
cons.dust.helpers = dustHelpers;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(methodOverride());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());

// CSRF protection for all routes
var csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);
app.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Rate limiters for expensive operations
var commandRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later.',
});

var fileOpsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests, please try again later.',
});

// Routes
app.use(routes.current_user);
app.get('/', routes.index);
app.get('/admin', routes.admin);
app.post('/admin', csrfProtection, routes.admin);
app.post('/create', commandRateLimit, csrfProtection, routes.create);
app.get('/destroy/:id', routes.destroy);
app.get('/edit/:id', routes.edit);
app.post('/update/:id', csrfProtection, routes.update);
app.post('/import', fileOpsRateLimit, csrfProtection, routes.import);
app.get('/about_new', routes.about_new);
app.get('/chat', routes.chat.get);
app.put('/chat', csrfProtection, routes.chat.add);
app.delete('/chat', csrfProtection, routes.chat.delete);
// Static
app.use(st({ path: './public', url: '/public' }));

// Add the option to output (sanitized!) markdown
marked.setOptions({ sanitize: true });
app.locals.marked = marked;

// development only
if (app.get('env') == 'development') {
  app.use(errorHandler());
}

var token = process.env.SECRET_TOKEN || '';
console.log('token configured: ' + (token ? 'yes' : 'no'));

https.createServer({
  key: process.env.SSL_KEY_CONTENT || '',
  cert: process.env.SSL_CERT_CONTENT || '',
}, app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
