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

module.exports = {
    decodeToken,
    verifyToken,
    getAccessToken
};