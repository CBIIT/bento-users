const fs = require('fs');

const config = {
  version: process.env.VERSION,
  date: process.env.DATE,
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  redirect_url: process.env.REDIRECT_URL,
  cookie_secret: process.env.COOKIE_SECRET,
  session_timeout: 30 * 60 * 1000 // 30 minutes
};

if (!config.version) {
  config.version = 'Version not set'
}

if (!config.date) {
  config.date = new Date();
}

module.exports = config;
