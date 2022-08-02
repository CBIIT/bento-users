const {REQUESTED, APPROVED} = require("../../constants/access-constant");
const ArmAccess = require("../../model/arm-access");
const {getApprovedArmIDs} = require("../../services/arm-access");

describe('arm service', () => {
    test('/create arm model', ()=> {
        const mockArms = [
            {armID: "request", accessStatus: REQUESTED},
            {armID: null, accessStatus: null},
            {armID: null, accessStatus: REQUESTED},
            {arm: null, access: REQUESTED},
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