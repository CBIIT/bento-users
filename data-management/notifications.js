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

async function sendReviewNotification(email, template_params, subject, message, messageVariables) {
    message = replaceMessageVariables(message, messageVariables);
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

function replaceMessageVariables(input, messageVariables){
    for (let key in messageVariables){
        input = input = input.replace(key, messageVariables[key]);
    }
    return input;
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
    sendApprovalNotification: async (email, messageVariables, template_params) => {
        return await sendReviewNotification(email, template_params, email_constants.DAR_APPROVAL_SUBJECT, email_constants.DAR_APPROVAL_CONTENT, messageVariables);
    },
    sendRejectionNotification: async (email, messageVariables, template_params) => {
        return await sendReviewNotification(email, template_params, email_constants.DAR_REJECTION_SUBJECT, email_constants.DAR_REJECTION_CONTENT, messageVariables);
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
    notifyUserArmAccessRequest: async (email, messageVariables, template_params) => {
        let message = replaceMessageVariables(email_constants.DAR_CONFIRMATION_CONTENT, messageVariables);
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.DAR_CONFIRMATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: message, ...template_params
                }),
                email
            );
        });
    },
    notifyAdminArmAccessRequest: async (email, messageVariables) => {
        let message = replaceMessageVariables(email_constants.DAR_ADMIN_NOTIFICATION_CONTENT, messageVariables);
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.DAR_ADMIN_NOTIFICATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: message, ...adminTemplate
                }),
                email
            );
        });
    },
    notifyAdminDisableUsers: async (email, messageVariables) => {
        let message = replaceMessageVariables(email_constants.ADMIN_DISABLE_USER_CONTENT, messageVariables);
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.ADMIN_DISABLE_USER_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: message, ...messageVariables
                }),
                email
            );
        });
    },
    notifyDisabledUsers: async (email, messageVariables) => {
        let message = replaceMessageVariables(email_constants.DISABLE_USER_CONTENT, messageVariables);
        return await send(async () => {
            await sendNotification(
                email_constants.NOTIFICATION_SENDER,
                email_constants.DISABLE_USER_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: message, ...messageVariables
                }),
                email
            );
        });
    }
}