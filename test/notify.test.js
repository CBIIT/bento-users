const {sendArmAccessNotification, sendAdminArmRequestNotification} = require("../data-management/notifications");
const {sendNotification} = require("../services/notify");
jest.mock("../services/notify");
describe('arm access notification', () => {
    sendNotification.mockReturnValue(Promise.resolve({}));
    const templates = {
        firstName: 'first name',
        lastName: 'last name',
    }

    test('/user arm access notification', async () => {
        await sendArmAccessNotification('young.yoo@nih.gov', templates);
        expect(sendNotification).toBeCalledTimes(1);
    });

    test('/admin arm request access notification', async () => {
        await sendAdminArmRequestNotification(['young.yoo@nih.gov'], templates);
        expect(sendNotification).toBeCalledTimes(1);
    });
});