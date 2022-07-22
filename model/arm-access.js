const {APPROVED, REJECTED, REQUESTED} = require("../constants/access-constant");
const {v4} = require('uuid')
class ArmAccess {

    static createRequestAccess() {
        let arm = new ArmAccess();
        arm._accessStatus = REQUESTED;
        arm._requestID = v4();
        return arm;
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