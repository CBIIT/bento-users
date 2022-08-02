const {notifyAdminArmAccessRequest} = require("../../data-management/notifications");
const {sendNotification} = require("../../services/notify");
const yaml = require('js-yaml');
jest.mock("js-yaml");
jest.mock("../../services/notify");

describe('email template reading error', () => {
    sendNotification.mockReturnValue(Promise.resolve({}));
    const templates = {
        firstName: 'first name',
        lastName: 'last name',
    }

    test('/email template reading error', async () => {
        yaml.load.mockReturnValue(Promise.resolve());
        jest.spyOn(console, 'error').mockImplementation(() => {});

        await notifyAdminArmAccessRequest(['bento.test@nih.gov'], templates);
        expect(sendNotification).toBeCalledTimes(0);
        expect(console.error).toBeCalledTimes(1);
    });

});