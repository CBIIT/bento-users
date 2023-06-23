const config = require('../config');
const notify = require("../data-management/notifications");
const {parseArrToStr} = require("../util/string-util");

class NotifyUserService{

    constructor(dataService) {
        this.dataService = dataService;
    }

    async notifyDisabledUsers(disableUsers) {
        const asyncNotify = async (email, body) => {
            await notify.notifyDisabledUsers(email, body);
        }
        let promises = [];
        for (const user of disableUsers) {
            let msg = {
                firstName: user.firstName,
                lastName: user.lastName,
                "inactiveDays": config.inactive_user_days,
                "systemURL": config.server_host
            };
            promises.push(asyncNotify(user.userEmail, msg));
        }
        // Notify disabled users
        await Promise.all(promises);
    }

    async notifyAdminDisabledUsers(disableUsers){
        const admins = await this.dataService.getAdmins();
        const asyncNotify = async (email, body) => {
            await notify.notifyAdminDisableUsers(email, body);
        }
        let promises = [];
        for (const admin of admins) {
            for (const u of disableUsers) {
                let msg = {
                    firstName : admin.firstName,
                    lastName: admin.lastName,
                    "inactiveDays": config.inactive_user_days,
                    "disableUser": parseArrToStr([u.firstName, u.lastName, u.userEmail, u.role, u.organization], ", "),
                }
                promises.push(asyncNotify(admin.email, msg));
            }
        }
        // Notify All Admin
        await Promise.all(promises);
    }

    async disableNotification(disableUsers){
        if (disableUsers && disableUsers.length > 0) {
            await this.notifyDisabledUsers(disableUsers);
            await this.notifyAdminDisabledUsers(disableUsers);
        }
    }
}

module.exports = { NotifyUserService };
