const GeneralUserCondition = require("../../model/valid-conditions/general-user-condition");
const {ADMIN, MEMBER} = require("../../bento-event-logging/const/user-constant");

describe('general user condition', () => {
    test('/create general', ()=> {
        const userInfo = {
            email: "testet@nih.gov",
            idp: "nih",
            role: ADMIN
        }
        const generalUserCondition = new GeneralUserCondition(userInfo);
        expect(generalUserCondition.isValid()).toBe(false);
    });

    test('/null role user', ()=> {
        const userInfo = {
            email: "testet@nih.gov",
            idp: "nih",
            role: null
        }
        const generalUserCondition = new GeneralUserCondition(userInfo);
        expect(generalUserCondition.isValid()).toBe(false);
    });

    test('/create general', ()=> {
        const userInfo = {
            email: "testet@nih.gov",
            idp: "nih",
            role: MEMBER
        }
        const generalUserCondition = new GeneralUserCondition(userInfo);
        expect(generalUserCondition.isValid()).toBe(true);
    });
});