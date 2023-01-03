const {errorName, valid_idps} = require("../../data-management/graphql-api-constants");
const {isElementInArrayCaseInsensitive} = require("../../util/string-util");
const InputCondition = require("./input-condition");
class idpCondition extends InputCondition {
    constructor(email, IDP) {
        super(email, IDP);
    }

    isValid() {
        return isElementInArrayCaseInsensitive(valid_idps, this._idp);
    }

    throwError() {
        throw new Error(errorName.INVALID_IDP);
    }

}

module.exports = idpCondition