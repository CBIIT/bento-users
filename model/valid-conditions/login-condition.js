const {errorName} = require("../../data-management/graphql-api-constants");
class LoginCondition {
    constructor(userInfo) {
        this._userInfo = userInfo;
    }

    isValidOrThrow() {
        if (!this._userInfo || !this._userInfo.email || !this._userInfo.idp) throw new Error(errorName.NOT_LOGGED_IN);
    }
}

module.exports = LoginCondition