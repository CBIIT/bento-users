const yaml = require('js-yaml');
const fs = require('fs');
const {sendNotification} = require("../services/notify");
const {createEmailTemplate} = require("../lib/create-email-template");

let email_constants = undefined
try {
    email_constants = yaml.load(fs.readFileSync('yaml/notification_email_values.yaml', 'utf8'));
} catch (e) {
    console.error(e)
}

const send = async (fn)=> {
    if (email_constants) return await fn();
    console.error("Unable to load email constants from file, email not sent");
}

module.exports = {
    sendAdminNotification: async (admins, template_params) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.ADMIN_NOTIFICATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.ADMIN_NOTIFICATION_CONTENT, ...template_params
                }),
                admins
            );
        });
    },
    sendRegistrationConfirmation: async (email, template_params) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.CONFIRMATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.CONFIRMATION_CONTENT, ...template_params
                }),
                email
            );
        });
    },
    sendApprovalNotification: async (email, template_params) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.APPROVAL_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.APPROVAL_CONTENT, ...template_params
                }),
                email
            );
        });
    },
    sendRejectionNotification: async (email, template_params) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.REJECTION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.REJECTION_CONTENT_PRE_COMMENT + template_params.comment + email_constants.REJECTION_CONTENT_POST_COMMENT, ...template_params
                }),
                email
            );
        });
    },
    sendEditNotification: async (email, template_params) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.EDIT_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.EDIT_CONTENT_PRE_COMMENT + template_params.comment + email_constants.EDIT_CONTENT_POST_COMMENT, ...template_params
                }),
                email
            );
        });
    },
    sendArmAccessNotification: async (email, template_params) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.ARM_REQUEST_ACCESS_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.ARM_REQUEST_ACCESS_COMMENT, ...template_params
                }),
                email
            );
        });
    },
    sendAdminArmRequestNotification: async (email, template_params) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.ADMIN_ARM_REQUEST_NOTIFICATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.ADMIN_ARM_REQUEST_ACCESS_COMMENT, ...template_params
                }),
                email
            );
        });
    },
}