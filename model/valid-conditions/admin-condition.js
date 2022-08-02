const {ADMIN} = require("../../constants/user-constant");
const {isCaseInsensitiveEqual} = require("../../util/string-util");
const {errorName} = require("../../data-management/graphql-api-constants");
const InputCondition = require("./input-condition");
class AdminCondition extends InputCondition {
    constructor(userInfo) {
        super(userInfo);
        this._role = userInfo.role;
    }

    isValid() {
        return isCaseInsensitiveEqual(this._role, ADMIN);
    }

    throwError() {
        throw new Error(errorName.INVALID_ACCESS_REQUEST);
    }
}

module.exports = AdminCondition