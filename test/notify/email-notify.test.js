const {notifyUserArmAccessRequest, notifyAdminArmAccessRequest, sendAdminNotification} = require("../../data-management/notifications");
const {sendNotification} = require("../../services/notify");
jest.mock("../../services/notify");

describe('arm access notification', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    sendNotification.mockReturnValue(Promise.resolve({}));
    const templates = {
        firstName: 'first name',
        lastName: 'last name',
    }

    test('/user arm access notification', async () => {
        await notifyUserArmAccessRequest('test@nih.gov', templates);
        expect(sendNotification).toBeCalledTimes(1);
    });

    test('/admin arm request access with array', async () => {
        await notifyAdminArmAccessRequest(['test.test@nih.gov', 'test@gmail.com'], {});
        expect(sendNotification).toBeCalledTimes(1);
    });

    test('/admin arm request access with non-array', async () => {
        await notifyAdminArmAccessRequest('test.test@nih.gov', {});
        expect(sendNotification).toBeCalledTimes(1);
    });

});