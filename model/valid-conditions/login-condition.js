const {errorName} = require("../../data-management/graphql-api-constants");
class LoginCondition {
    constructor(userInfo) {
        this._userInfo = userInfo;
    }

    isValid() {
        return this._userInfo && this._userInfo.email && this._userInfo.idp
    }

    throwError() {
        throw new Error(errorName.NOT_LOGGED_IN);
    }

}

module.exports = LoginCondition