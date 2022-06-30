const newrelic = require('newrelic');
const graphql = require("./data-management/init-graphql");
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const fs = require('fs');
const cors = require('cors');
const config = require('./config');

//Print configuration
console.log(config);

const LOG_FOLDER = 'logs';
if (!fs.existsSync(LOG_FOLDER)) {
    fs.mkdirSync(LOG_FOLDER);
}
// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, LOG_FOLDER, 'access.log'), { flags: 'a'})


const versionEndpoint = function(req, res) {
    res.json({
        version: config.version,
        date: config.date
    });
};

const create404 = function(req, res, next) {
    next(createError(404));
};

const errorHandler = function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.json(res.locals.message);
};

const storeUserInfoMiddleware = async function (req, res, next) {
    req.userInfo = {email: req.headers.email, idp: req.headers.idp}
    next();
};

// Initialize app
const app = express();
// App configuration middleware

app.use(cors());

// setup the logger
app.use(logger('combined', { stream: accessLogStream }))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(storeUserInfoMiddleware);
app.use('/api/auth/graphql', graphql);

// catch 404 and forward to error handler
app.use(create404);
// error handler
app.use(errorHandler);

module.exports = app;
