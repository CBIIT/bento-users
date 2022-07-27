class ACL {
    constructor(acl) {
        this._acl = acl;
    }

    static createACLFromArms(arms) {
        const armArr  = (arms) && Array.isArray(arms) ? arms : [];
        const result = [];
        Array.from(armArr)
            .forEach((arm) => {
                if (arm.armID) result.push(arm.armID)
            });
        return new ACL(result);
    }

    getACL() {
        return this._acl;
    }
}

module.exports = ACL