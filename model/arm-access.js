const {APPROVED, REJECTED, REQUESTED} = require("../constants/access-constant");
const {v4} = require('uuid')
const {getTimeNow} = require("../util/time-util");
class ArmAccess {

    static createRequestAccess() {
        let arm = new ArmAccess();
        arm._accessStatus = REQUESTED;
        arm._requestID = v4();
        return arm;
    }

    static createApprovalAccess(adminUserID, requestID, comment) {
        let arm = new ArmAccess()
        arm._requestID = requestID
        arm._approvedBy = adminUserID
        arm._accessStatus = APPROVED;
        arm._comment = comment;
        arm._reviewDate = getTimeNow();
        return arm;
    }

    static createRejectAccess(requestID) {
        let arm = new ArmAccess()
        arm._requestID = requestID
        arm._accessStatus = REJECTED;
        arm._reviewDate = getTimeNow();
        return arm;
    }

    getRequestID() {
        return this._requestID;
    }

    getAccessStatus() {
        return this._accessStatus;
    }

}

module.exports = ArmAccess