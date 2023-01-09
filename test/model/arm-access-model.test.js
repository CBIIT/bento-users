const ArmAccess = require("../../model/arm-access");
const Arm = require("../../model/arm");
const {APPROVED, PENDING} = require("../../bento-event-logging/const/access-constant");

describe('arm access model', () => {
    test('/create arm access model', ()=> {
        const arm = new Arm("abcd")
        const armAccess = new ArmAccess(arm, APPROVED);

        expect(arm).toBe(armAccess.getArm());
        expect(armAccess.getAccessStatus()).toBe(APPROVED);
    });


    test('/create arm access array', ()=> {
        const mockArms = [
            {armID: "request", accessStatus: PENDING},
            {armID: null, accessStatus: null},
            {armID: null, accessStatus: PENDING},
            {arm: null, access: PENDING},
            {armID: "approved", accessStatus: APPROVED}
        ]

        // only valid arm access
        const armAccessArr = ArmAccess.createArmAccessArray(mockArms);
        expect(armAccessArr.length).toBe(2);

        const result = [];
        Array.from(armAccessArr)
            .forEach((armAccess)=> {
                result.push(armAccess.getArm().getArmID());
        });
        expect(result).toStrictEqual(["request", "approved"])
    });
});