const {errorName} = require("../../data-management/graphql-api-constants");
class ArmExistCondition {
    // Request arms are examined with arms in db
    constructor(arms, reqArmIDs) {
        this._arms = arms;
        this._reqArmIDs = reqArmIDs;
    }

    isValid() {
        return this._arms.length > 0 && this._arms.length === this._reqArmIDs.length;
    }

    throwError() {
        throw new Error(errorName.INVALID_REQUEST_ARM);
    }
}

class ArmRequestParamsCondition {
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
    ArmRequestParamsCondition,
    ArmExistCondition
}