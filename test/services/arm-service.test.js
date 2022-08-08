const {PENDING, APPROVED} = require("../../constants/access-constant");
const ArmAccess = require("../../model/arm-access");
const {getApprovedArmIDs} = require("../../services/arm-access");

describe('arm service', () => {
    test('/create arm model', ()=> {
        const mockArms = [
            {armID: "request", accessStatus: PENDING},
            {armID: null, accessStatus: null},
            {armID: null, accessStatus: PENDING},
            {arm: null, access: PENDING},
            {armID: "approved1", accessStatus: APPROVED},
            {armID: "duplicateID", accessStatus: APPROVED},
            {armID: "duplicateID", accessStatus: APPROVED}
        ]
        // only valid arm access
        const armAccessArr = ArmAccess.createArmAccessArray(mockArms);
        const armIDs = getApprovedArmIDs(armAccessArr);
        expect(armIDs.length).toBe(2);
        // only unique ids needs to be stored
        expect(armIDs).toStrictEqual(["approved1", "duplicateID"]);
    });
});