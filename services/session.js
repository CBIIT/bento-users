const session = require('express-session');
const {randomBytes} = require("crypto");
const config = require('../config');
const UserBuilder = require("../model/user");
const Session = require("../model/session");
const MySQLStore = require('express-mysql-session')(session);

function createSession({ sessionSecret, session_timeout } = {}) {
    sessionSecret = sessionSecret || randomBytes(16).toString("hex");
    return session({
        secret: sessionSecret,
        // rolling: true,
        saveUninitialized: false,
        resave: true,
        store: new MySQLStore({
          host: config.mysql_host,
          port: config.mysql_port,
          user: config.mysql_user,
          password: config.mysql_password,
          database: config.mysql_database,
          checkExpirationInterval: 10 * 1000, // 10 secs
          expiration: session_timeout
        })
    });
}

const saveUserInfoToSession = (session, userInfo)=> {
    const user = UserBuilder.createUser(userInfo);
    Session.saveUserInfo(session, user);
}

module.exports = {
    createSession,
    saveUserInfoToSession
};