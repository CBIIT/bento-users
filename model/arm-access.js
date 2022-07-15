const {APPROVED, REJECTED, REQUESTED} = require("../constants/access-constant");
const {v4} = require('uuid')
const {getTimeNow} = require("../util/time-util");
class ArmAccess {

    constructor() {
        this._requestID = v4();
        // by default, requested access
        this._accessStatus = REQUESTED;
        this._approvedBy = '';
        this._reviewDate = '';
        this._armIDs = '';
        this._userID = '';
        this._comment = '';
    }

    getArmAccess() {
        return {requestID: this._requestID,
            userID: this._userID,
            accessStatus: this._accessStatus,
            reviewDate: this._reviewDate,
            approvedBy: this._approvedBy,
            armIds: this._armIDs,
            comment: this._comment
        }
    }

    static createRequestAccess(userID, armIDs) {
        let arm = new ArmAccess()
        arm._userID = userID
        arm._armIDs = armIDs;
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
}

module.exports = ArmAccess