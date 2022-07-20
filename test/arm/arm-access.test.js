const ArmAccess = require("../../model/arm-access");
const {APPROVED, REQUESTED, REJECTED} = require("../../constants/access-constant");
describe('register user API test', () => {

    test('/request access', ()=> {
        const result = ArmAccess.createRequestAccess('a', ['armA']);
        expect(result).toBeTruthy();
        expect(result.getArmAccess().userID).toBe('a');
        expect(result.getArmAccess().armIds).toStrictEqual(['armA']);
        expect(result.getArmAccess().accessStatus).toBe(REQUESTED);

    });

    test('/approval access', ()=> {
        const arm = ArmAccess.createApprovalAccess('admin', 'requestID','thanks');
        const result = arm.getArmAccess();
        expect(result).toBeTruthy();
        expect(result.approvedBy).toBe('admin');
        expect(result.requestID).toBe('requestID');
        expect(result.accessStatus).toBe(APPROVED);
        expect(result.reviewDate).toBeTruthy();
        expect(result.userID).toBe('');
        expect(result.comment).toBe('thanks');
    });

    test('/reject access', ()=> {
        const arm = ArmAccess.createRejectAccess('requestID');
        const result = arm.getArmAccess();
        expect(result).toBeTruthy();
        expect(result.approvedBy).toBe('');
        expect(result.requestID).toBe('requestID');
        expect(result.accessStatus).toBe(REJECTED);
        expect(result.reviewDate).toBeTruthy();
        expect(result.userID).toBe('');
        expect(result.comment).toBe('');
    });
});