const {errorName} = require("../../data-management/graphql-api-constants");
class InputCondition {
    constructor(email, idp) {
        this._email = email;
        this._idp = idp;
        if (!email || !idp) throw new Error(errorName.MISSING_INPUTS);
    }
}

module.exports = InputCondition