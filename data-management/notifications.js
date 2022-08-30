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
const adminTemplate = {firstName: "Bento Administrator", lastName: ""};

async function sendReviewNotification(email, template_params, subject, message) {
    let template = (template_params.comment && template_params.comment !== "") ?
        "notification-with-comment-template.html" : "notification-template.html";
    return await send(async () => {
        await sendNotification(
            email_constants.NOTIFICATION_SENDER,
            subject,
            await createEmailTemplate(template, {
                message: message, ...template_params
            }),
            email
        );
    });
}

module.exports = {
    sendAdminNotification: async (admins, _) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.ADMIN_NOTIFICATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.ADMIN_NOTIFICATION_CONTENT, ...adminTemplate
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
        return await sendReviewNotification(email, template_params, email_constants.DAR_APPROVAL_SUBJECT, email_constants.DAR_APPROVAL_CONTENT);
    },
    sendRejectionNotification: async (email, template_params) => {
        return await sendReviewNotification(email, template_params, email_constants.DAR_REJECTION_SUBJECT, email_constants.DAR_REJECTION_CONTENT);
    },
    sendEditNotification: async (email, template_params) => {
        let template = (template_params.comment && template_params.comment !== "") ?
            "notification-with-comment-template.html" : "notification-template.html";
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.EDIT_SUBJECT,
                await createEmailTemplate(template, {
                    message: email_constants.EDIT_CONTENT, ...template_params
                }),
                email
            );
        });
    },
    notifyUserArmAccessRequest: async (email, template_params) => {
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
    notifyAdminArmAccessRequest: async (email, _) => {
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.ADMIN_ARM_REQUEST_NOTIFICATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: email_constants.ADMIN_ARM_REQUEST_ACCESS_COMMENT, ...adminTemplate
                }),
                email
            );
        });
    }
}