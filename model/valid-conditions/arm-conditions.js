const {errorName} = require("../../data-management/graphql-api-constants");
class ArmCondition {
    constructor(arms, armIDs) {
        this._arms = arms;
        this._armIDs = armIDs;
    }

    isValid() {
        return this._arms.length > 0 && this._arms.length === this._armIDs.length;
    }

    throwError() {
        throw new Error(errorName.INVALID_REQUEST_ARM);
    }
}

class ArmParameterCondition {
    constructor(parameters) {
        this._parameters = parameters;
    }

    isValid() {
        return this._parameters.userInfo.armIDs;
    }

    throwError() {
        throw new Error(errorName.MISSING_ARM_REQUEST_INPUTS);
    }

}

module.exports = {
    ArmParameterCondition,
    ArmCondition
}