const {MEMBER, NON_MEMBER} = require("../../bento-event-logging/const/user-constant");
const {isCaseInsensitiveEqual} = require("../../util/string-util");
const {errorName} = require("../../data-management/graphql-api-constants");
const InputCondition = require("./input-condition");
class GeneralUserCondition extends InputCondition {
    constructor(email, idp, role) {
        super(email, idp);
        this._role = role;
    }

    isValid() {
        return isCaseInsensitiveEqual(this._role, MEMBER) || isCaseInsensitiveEqual(this._role, NON_MEMBER);
    }

    throwError() {
        throw new Error(errorName.NOT_GENERAL_USER);
    }
}

module.exports = GeneralUserCondition