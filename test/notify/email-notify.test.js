// const {notifyUserArmAccessRequest, notifyAdminArmAccessRequest, sendAdminNotification, NotificationsService} = require("../../data-management/notifications");
// const {sendNotification, NotifyService} = require("../../services/notify");
// jest.mock("../../services/notify");
//
// const notifyService = new NotifyService();
// const notificationsService = new NotificationsService();
//
// describe('arm access notification', () => {
//
//     afterEach(() => {
//         jest.clearAllMocks();
//     });
//
//     notifyService.sendNotification.mockReturnValue(Promise.resolve({}));
//     const templates = {
//         firstName: 'first name',
//         lastName: 'last name',
//     }
//
//     test('/user arm access notification', async () => {
//         await notificationsService.notifyUserArmAccessRequest('test@nih.gov', templates);
//         expect(notifyService.sendNotification).toBeCalledTimes(1);
//     });
//
//     test('/admin arm request access with array', async () => {
//         await notificationsService.notifyAdminArmAccessRequest(['test.test@nih.gov', 'test@gmail.com'], {});
//         expect(notifyService.sendNotification).toBeCalledTimes(1);
//     });
//
//     test('/admin arm request access with non-array', async () => {
//         await notificationsService.notifyAdminArmAccessRequest('test.test@nih.gov', {});
//         expect(notifyService.sendNotification).toBeCalledTimes(1);
//     });
//
// });