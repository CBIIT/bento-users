const {errorName} = require("../../data-management/graphql-api-constants");
class LoginCondition {
    constructor(email, idp) {
        this._email = email;
        this._idp = idp;
    }

    isValid() {
        return this._email && this._idp
    }

    throwError() {
        throw new Error(errorName.NOT_LOGGED_IN);
    }

}

module.exports = LoginCondition