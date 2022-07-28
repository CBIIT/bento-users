class Arm {
    constructor(armID, accessStatus) {
        this._armID = armID;
        this._accessStatus = accessStatus;
    }

    static createArmArray(armArray) {
        const armArr  = (armArray) && Array.isArray(armArray) ? armArray : [];
        const result = [];
        Array.from(armArr)
            .forEach((arm) => {
                if (arm.armID && arm.accessStatus) result.push(new Arm(arm.armID, arm.accessStatus));
            });
        return result;
    }

    getArmID() {
        return this._armID;
    }

    getArmAccessStatus() {
        return this._accessStatus;
    }
}

module.exports = Arm