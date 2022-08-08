const {APPROVED, PENDING} = require("../constants/access-constant");
const {v4} = require('uuid')
const Arm = require("./arm");
class ArmAccess {

    constructor(arm, accessStatus) {
        this._arm = arm;
        this._accessStatus = accessStatus;
    }

    static createRequestAccess() {
        let arm = new ArmAccess();
        arm._accessStatus = PENDING;
        arm._requestID = v4();
        return arm;
    }

    static createArmAccessArray(arms) {
        const result = [];
        const armArr  = (arms) && Array.isArray(arms) ? arms : [];
        Array.from(armArr)
            .forEach((arm) => {
                if (arm.accessStatus && arm.armID) {
                    result.push(
                        new ArmAccess(
                            new Arm(arm.armID),
                            arm.accessStatus)
                    )
                }
            });
        return result;
    }

    // reject access request if previously approved or requested access
    static rejectRequestAccessStatus() {
        return [PENDING, APPROVED];
    }

    getRequestID() {
        return this._requestID;
    }

    getAccessStatus() {
        return this._accessStatus;
    }

    getArm() {
        return this._arm;
    }
}

module.exports = ArmAccess