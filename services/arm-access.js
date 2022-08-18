const {isCaseInsensitiveEqual} = require("../util/string-util");
const {APPROVED} = require("../constants/access-constant");

const getApprovedArmIDs = (armAccessArray) => {
    const result = new Set();
    Array.from(armAccessArray)
        .forEach((armAccess) => {
            if (isCaseInsensitiveEqual(armAccess.getAccessStatus(), APPROVED)) {
                const arm = armAccess.getArm();
                result.add(arm.getArmID());
            }
        });
    return Array.from(result);
}

module.exports = { getApprovedArmIDs }
