class User {
    constructor(firstName, lastName, email, idp, role, organization, acl) {
        this._firstName = firstName;
        this._lastName = lastName;
        this._email = email;
        this._role = role;
        this._organization = organization;
        this._idp = idp;
        this._acl = acl;
    }

    getFirstName() { return this._firstName; }
    getLastName() { return this._lastName; }
    getIDP() { return this._idp; }
    getACL() { return this._acl; }
    getEmail() { return this._email; }
    getRole() { return this._role };
    getOrganization() { return this._organization; }
    getUserInfo() {
        return {firstName: this._firstName, lastName: this._lastName, email: this._email, role: this._role, idp: this._idp, organization: this._organization, acl: this._acl};
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
        this._role = (role) ? role : '';
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

    static createUser(firstName, lastName, email, idp) {
        return new UserBuilder(firstName, lastName, email, idp)
            .build()
    }

    static createUserFromSession(userInfo) {
        return new UserBuilder(userInfo.firstName, userInfo.lastName, userInfo.email, userInfo.idp)
            .setRole(userInfo.role)
            .setOrganization(userInfo.organization)
            .setACL(userInfo.acl)
            .build();
    }

    build() {
        if (!this._organization) this._organization = '';
        if (!this._acl) this._acl = [];
        if (!this._role) this._role = '';
        return new User(this._firstName, this._lastName, this._email, this._idp, this._role, this._organization, this._acl);
    }
}

module.exports = UserBuilder