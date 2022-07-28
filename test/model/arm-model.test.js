const Arm = require("../../model/arm");

describe('arm model', () => {
    test('/create arm model', ()=> {
        // Only valid arms needs to be collected
        const arm = new Arm("abcd");
        expect(arm.getArmID()).toBe("abcd");
    });
});