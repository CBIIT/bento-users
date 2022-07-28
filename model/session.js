const {getApprovedArmIDs} = require("../services/arm-service");
class Session {
    constructor(session) {
        this._role = session.role ? session.role : "";
        this._acl = session.acl ? session.acl : [];
        this._status = session.status ? session.status : "";
    }

    static saveUserInfo(session, user) {
        session.userInfo.acl = getApprovedArmIDs(user.getACL());
        session.userInfo.role = user.getRole();
        session.userInfo.userStatus = user.getStatus();
        return new Session(session.userInfo);
    }

    getRole() { return this._role; }
    getACL() { return this._acl; }
    getStatus() { return this._status; }
}

module.exports = Session