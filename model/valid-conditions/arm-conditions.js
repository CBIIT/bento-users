const {errorName} = require("../../data-management/graphql-api-constants");
const {DISABLED} = require("../../bento-event-logging/const/user-constant");
const {user_statuses} = require("../../bento-event-logging/const/format-constants");
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
    constructor(armIds) {
        this.armIds = armIds;
    }

    isValid() {
        return this.armIds;
    }

    throwError() {
        throw new Error(errorName.MISSING_ARM_REQUEST_INPUTS);
    }

}

class ArmReqUserStatusCondition {
    constructor(userStatus) {
        this.statusesSet = new Set(user_statuses);
        this.status = userStatus;
    }

    isValid() {
        return this.statusesSet.has(this.status) && this.status !== DISABLED;
    }

    throwError() {
        throw new Error(errorName.DISABLED_USER_ARM_REQUEST);
    }

}

module.exports = {
    ArmRequestParamsCondition,
    ArmExistCondition,
    ArmReqUserStatusCondition
}