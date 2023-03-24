const jwt = require("jsonwebtoken");
const config = require("../config");

const verifyToken = (token) => {
    let isValid = false;
    jwt.verify(token, config.token_secret, (error, _) => {
        if (!error) isValid = true;
    });
    return isValid;
}

const decodeToken = (token) => {
    let userInfo;
    jwt.verify(token, config.token_secret, (error, encoded) => {
        userInfo = error ? {} : encoded;
    });
    return userInfo;
}

const getAccessToken = (params) => {
    const auth = (params) ? params['authorization'] : "";
    return auth && auth.split(' ')[1];
}

// tokenTimer must be less than inactive user timeout
const timerLessThanInactiveDays = (inactiveDays, tokenTimeout) => {
    // default timeout
    const defaultSecondTimeout = 30 * 60;
    const timeout = (tokenTimeout) ? tokenTimeout : defaultSecondTimeout;
    const dayToSeconds = (day) => day * 24 * 60 * 60;
    const inactiveUserTimeout = (inactiveDays) ? Math.min(dayToSeconds(inactiveDays), timeout) : defaultSecondTimeout;
    return Math.min(inactiveUserTimeout, timeout);
}


module.exports = {
    decodeToken,
    verifyToken,
    getAccessToken,
    timerLessThanInactiveDays,
};