const ArmAccess = require("../../model/arm-access");
const {REQUESTED} = require("../../constants/access-constant");
describe('register user API test', () => {

    test('/request access', ()=> {
        const result = ArmAccess.createRequestAccess();
        expect(result).toBeTruthy();
        expect(result.getAccessStatus()).toBe(REQUESTED);

    });
});