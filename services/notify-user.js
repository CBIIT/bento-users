const config = require('../config');
const notify = require("../data-management/notifications");
const neo4j = require("../data-management/neo4j-service");
const {parseArrToStr} = require("../util/string-util");

const notifyDisabledUsers = async (disableUsers) => {
    const asyncNotify = async (email, body) => {
        await notify.notifyDisabledUsers(email, body);
    }
    let promises = [];
    for (const user of disableUsers) {
        let msg = {
            firstName : user.firstName,
            lastName: user.lastName,
            "inactiveDays": config.inactive_user_days,
            "systemURL": config.server_host
        };
        promises.push(asyncNotify(user.userEmail, msg));
    }
    // Notify disabled users
    await Promise.all(promises);
}

const notifyAdminDisabledUsers = async (disableUsers) => {
    const admins = await neo4j.getAdmins();
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

const disableNotification = async (disableUsers) => {
    if (disableUsers && disableUsers.length > 0) {
        await notifyDisabledUsers(disableUsers);
        await notifyAdminDisabledUsers(disableUsers);
    }
}

module.exports = { disableNotification }
