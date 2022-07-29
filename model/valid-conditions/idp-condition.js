const {errorName, valid_idps} = require("../../data-management/graphql-api-constants");
const {isElementInArray} = require("../../util/string-util");
const InputCondition = require("./input-condition");
class idpCondition extends InputCondition {
    constructor(userInfo) {
        super(userInfo);
        this._idp = userInfo.idp;
    }

    isValid() {
        return isElementInArray(valid_idps, this._idp);
    }

    throwError() {
        throw new Error(errorName.INVALID_IDP);
    }

}

module.exports = idpCondition