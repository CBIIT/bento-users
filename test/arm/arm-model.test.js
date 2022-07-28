const Arm = require("../../model/arm");
const {APPROVED, REQUESTED} = require("../../constants/access-constant");

describe('arm model', () => {
    test('/create arm model', ()=> {

        const arms = [
            {armID: 'a', accessStatus: APPROVED},
            {armID: 'b', accessStatus: REQUESTED},
            {armID: 'c', accessStatus: null},
            {armID: null, accessStatus: null},
            {accessStatus: APPROVED},
            {armId: 'd', accessStatus: APPROVED},
        ];
        // Only valid arms needs to be collected
        const armArr = Arm.createArmArray(arms);
        expect(armArr.length).toBe(2);

        const armIDs = [];
        Array.from(armArr).forEach((arm)=>{
            armIDs.push(arm.getArmID());
        });
        expect(armIDs).toStrictEqual(['a', 'b']);
    });
});