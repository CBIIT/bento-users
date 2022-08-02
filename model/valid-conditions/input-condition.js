const {errorName} = require("../../data-management/graphql-api-constants");
class InputCondition {
    constructor(userInfo) {
        if (!userInfo || !userInfo.email || !userInfo.idp) throw new Error(errorName.MISSING_INPUTS);
    }
}

module.exports = InputCondition