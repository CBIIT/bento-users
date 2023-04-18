const {NON_MEMBER} = require("../bento-event-logging/const/user-constant");
const ArmAccess = require("./arm-access");

class User {
    constructor(firstName, lastName, email, idp, role, status, organization, acl, tokens) {
        this._firstName = firstName;
        this._lastName = lastName;
        this._email = email;
        this._role = role;
        this._status = status;
        this._organization = organization;
        this._idp = idp;
        this._acl = acl;
        this._tokens = tokens;
    }

    getFirstName() { return this._firstName; }
    getLastName() { return this._lastName; }
    getIDP() { return this._idp; }
    getACL() { return this._acl; }
    getEmail() { return this._email; }
    getRole() { return this._role };
    getStatus() { return this._status };
    getOrganization() { return this._organization; }
    getTokens(){return this._tokens;}
    getUserInfo() {
        return {firstName: this._firstName, lastName: this._lastName, email: this._email, role: this._role, status: this._status, idp: this._idp, organization: this._organization, acl: this._acl, tokens: this._tokens};
    }

}

class UserBuilder {
    constructor(firstName, lastName, email, idp) {
        this._firstName = firstName;
        this._lastName = lastName;
        this._email = email;
        this._idp = idp;
    }

    setRole(role) {
        // New user assigned as role of NON_MEMBER
        this._role = (role) ? role : NON_MEMBER;
        return this
    }

    setStatus(status) {
        this._status = (status) ? status : '';
        return this
    }

    setACL(acl) {
        this._acl = (acl) && Array.isArray(acl) ? acl : [];
        return this
    }

    setOrganization(organization) {
        this._organization = (organization) ? organization : '';
        return this
    }

    setTokens(tokens){
        this._tokens = (tokens) ? tokens : [];
        return this;
    }

    static createUserFromSession(firstName, lastName, email, idp) {
        return new UserBuilder(firstName, lastName, email, idp)
            .build()
    }

    static createUser(userInfo) {
        return new UserBuilder(userInfo.firstName, userInfo.lastName, userInfo.email, userInfo.idp)
            .setRole(userInfo.role)
            .setStatus(userInfo.userStatus)
            .setOrganization(userInfo.organization)
            // acl is a list of Arm
            .setACL(ArmAccess.createArmAccessArray(userInfo.acl))
            .build();
    }

    build() {
        if (!this._organization) this._organization = '';
        if (!this._acl) this._acl = [];
        if (!this._role) this._role = '';
        if (!this._status) this._status = '';
        if (!this._tokens) this._tokens = [];
        return new User(this._firstName, this._lastName, this._email, this._idp, this._role, this._status, this._organization, this._acl, this._tokens);
    }
}

module.exports = UserBuilder