const {ADMIN, ACTIVE} = require("../../constants/user-constant");
const {isCaseInsensitiveEqual} = require("../../util/string-util");
const {errorName} = require("../../data-management/graphql-api-constants");
const InputCondition = require("./input-condition");
class AdminCondition extends InputCondition {
    constructor(userInfo) {
        super(userInfo);
        this._role = userInfo.role;
        this._status = userInfo.userStatus;
    }

    isValid() {
        return isCaseInsensitiveEqual(this._role, ADMIN) && isCaseInsensitiveEqual(this._status, ACTIVE);
    }

    throwError() {
        throw new Error(errorName.NOT_ADMIN);
    }
}

module.exports = AdminCondition