const {APPROVED, REQUESTED} = require("../constants/access-constant");
const {v4} = require('uuid')
const {isCaseInsensitiveEqual} = require("../util/string-util");
class ArmAccess {

    static createRequestAccess() {
        let arm = new ArmAccess();
        arm._accessStatus = REQUESTED;
        arm._requestID = v4();
        return arm;
    }

    static getApprovedArmIDs(armArray) {
        const result = new Set();
        Array.from(armArray)
            .forEach((arm) => {
                if (isCaseInsensitiveEqual(arm.getArmAccessStatus(), APPROVED)) result.add(arm.getArmID());
            });
        return Array.from(result);
    }

    // reject access request if previously approved or requested access
    static rejectRequestAccessStatus() {
        return [REQUESTED, APPROVED];
    }

    getRequestID() {
        return this._requestID;
    }

    getAccessStatus() {
        return this._accessStatus;
    }

}

module.exports = ArmAccess