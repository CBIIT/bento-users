const {ADMIN} = require("../../constants/user-constant");
const {isCaseInsensitiveEqual} = require("../../util/string-util");
const {errorName} = require("../../data-management/graphql-api-constants");
const InputCondition = require("./input-condition");
class AdminCondition extends InputCondition {
    constructor(userInfo) {
        super(userInfo);
        this._role = userInfo.role;
    }

    isValidOrThrow() {
        if (isCaseInsensitiveEqual(this._role, ADMIN)) throw new Error(errorName.INVALID_REQUEST_ARM);
    }
}

module.exports = AdminCondition