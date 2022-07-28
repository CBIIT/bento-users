const ArmAccess = require("../../model/arm-access");
const {REQUESTED, APPROVED} = require("../../constants/access-constant");
const Arm = require("../../model/arm");
describe('register user API test', () => {

    test('/request access', ()=> {
        const result = ArmAccess.createRequestAccess();
        expect(result).toBeTruthy();
        expect(result.getAccessStatus()).toBe(REQUESTED);

    });

    test('/get only approved arm', ()=> {
        const arms = [
            {armID: 'a', accessStatus: APPROVED},
            {armID: 'duplicate', accessStatus: APPROVED},
            {armID: 'duplicate', accessStatus: APPROVED},
            {armID: 'b', accessStatus: REQUESTED},
            {armID: 'c', accessStatus: null},
            {armID: undefined, accessStatus: undefined},
        ]
        const armArr = Arm.createArmArray(arms);
        expect(armArr.length).toBe(4);
        const armIds = ArmAccess.getApprovedArmIDs(armArr);
        // only unique approved arm
        expect(armIds.length).toBe(2);
        expect(armIds).toStrictEqual(['a', 'duplicate']);

    });
});