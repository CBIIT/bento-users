const dotenv = require('dotenv');
const {timerLessThanInactiveDays} = require("./services/tokenizer");
dotenv.config();

const config = {
  version: process.env.VERSION,
  date: process.env.DATE,
  emails_enabled: process.env.EMAILS_ENABLED ? process.env.EMAILS_ENABLED.toLowerCase() === 'true' : true,
  inactive_user_days : process.env.INACTIVE_USER_DAYS ? process.env.INACTIVE_USER_DAYS : 60,
  cookie_secret: process.env.COOKIE_SECRET,
  session_timeout: process.env.SESSION_TIMEOUT ? parseInt(process.env.SESSION_TIMEOUT) * 1000 : 1000 * 30 * 60,  // 30 minutes
  token_secret: process.env.TOKEN_SECRET,
  token_timeout: timerLessThanInactiveDays(this.inactive_user_days, parseInt(process.env.TOKEN_TIMEOUT)),

  //Neo4j connection
  NEO4J_URI: process.env.NEO4J_URI,
  NEO4J_USER: process.env.NEO4J_USER,
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
  // MySQL Session
  mysql_host: process.env.MYSQL_HOST,
  mysql_port: process.env.MYSQL_PORT,
  mysql_user: process.env.MYSQL_USER,
  mysql_password: process.env.MYSQL_PASSWORD,
  mysql_database: process.env.MYSQL_DATABASE,
  //Initial database loading
  DATA_LOADING_MODE: process.env.DATA_LOADING_MODE,
  DATA_FILE: process.env.DATA_FILE,

  // Email settings
  email_transport: getTransportConfig(),

  //Seed data for initialization
  seed_data_file: process.env.SEED_DATA_FILE,
  server_host: process.env.SERVER_HOST ? process.env.SERVER_HOST : "https://www.bento-tools.org",

  //Events Download Endpoint
  //One million events is roughly estimated to generate a file about 235 MB in size
  event_download_limit: process.env.EVENT_DOWNLOAD_LIMIT ? Math.MIN(parseInt(process.env.EVENT_DOWNLOAD_LIMIT), 1000000) : 1000000
};

function getTransportConfig() {
  return {
    host: process.env.EMAIL_SMTP_HOST,
    port: process.env.EMAIL_SMTP_PORT,
    // Optional AWS Email Identity
    ...(process.env.EMAIL_USER && {
          secure: true, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER, // generated ethereal user
            pass: process.env.EMAIL_PASSWORD, // generated ethereal password
          }
        }
    )
  };
}


if (!config.version) {
  config.version = 'Version not set'
}

if (!config.date) {
  config.date = new Date();
}

module.exports = config;
