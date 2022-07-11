const {sendArmAccessNotification} = require("../data-management/notifications");
const {sendNotification} = require("../services/notify");
jest.mock("../services/notify");
describe('arm access notification', () => {
    test('/arm access notification', async () => {
        sendNotification.mockReturnValue(Promise.resolve({}));
        const templates = {
            firstName: 'first name',
            lastName: 'last name',
        }
        await sendArmAccessNotification('bento@nih.gov', templates);
        expect(sendNotification).toBeCalledTimes(1);
    });
});