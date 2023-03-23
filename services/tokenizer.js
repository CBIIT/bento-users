const jwt = require("jsonwebtoken");
const verifyToken = (token , tokenSecret) => {
    let isValid = false;
    jwt.verify(token, tokenSecret, (error, _) => {
        if (!error) isValid = true;
    });
    return isValid;
}

const decodeToken = (token, tokenSecret) => {
    let userInfo;
    jwt.verify(token, tokenSecret, (error, encoded) => {
        userInfo = error ? {} : encoded;
    });
    return userInfo;
}

const createToken = (userInfo, token_secret, tokenTimeout)=> {
    return jwt.sign(
        userInfo,
        token_secret,
        { expiresIn: tokenTimeout });
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
    timerLessThanInactiveDays,
    decodeToken,
    verifyToken,
    getAccessToken,
    createToken
};