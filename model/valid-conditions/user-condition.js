const {errorName, user_roles, user_statuses} = require("../../data-management/graphql-api-constants");
class UserRoleCondition {
    constructor(role) {
        this._role = role;
    }

    isValid() {
        return this._role && user_roles.includes(this._role);
    }

    throwError() {
        throw new Error(errorName.INVALID_ROLE);
    }
}

class UserStatusCondition {
    constructor(userStatus) {
        this._userStatus = userStatus;
    }

    isValid() {
        return this._userStatus === "" || (this._userStatus && user_statuses.includes(this._userStatus));
    }

    throwError() {
        throw new Error(errorName.INVALID_STATUS);
    }
}

module.exports = {
    UserRoleCondition,
    UserStatusCondition
}