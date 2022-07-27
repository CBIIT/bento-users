class Session {
    constructor(session) {
        this._role = session.role ? session.role : "";
        this._acl = session.acl ? session.acl : [];
        this._organization = session.organization? session.organization : "";
    }

    static saveUserInfo(session, user) {
        session.userInfo.acl = user.getACL();
        session.userInfo.organization = user.getOrganization();
        session.userInfo.role = user.getRole();
        return new Session(session.userInfo);
    }

    getRole() { return this._role; }
    getACL() { return this._acl; }
    getOrganization() { return this._organization; }
}

module.exports = Session