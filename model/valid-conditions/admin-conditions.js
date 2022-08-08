const {errorName} = require("../../data-management/graphql-api-constants");
const {ADMIN, ACTIVE} = require("../../constants/user-constant");
class AdminCondition {
    constructor(userInfo) {
        this._role = userInfo.role;
        this._userStatus = userInfo.userStatus;
    }

    isValid() {
        return this._role === ADMIN && this._userStatus === ACTIVE;
    }

    throwError() {
        throw new Error(errorName.NOT_AUTHORIZED);
    }
}

module.exports = AdminCondition;