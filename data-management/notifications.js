const yaml = require('js-yaml');
const fs = require('fs');
const {createEmailTemplate} = require("../lib/create-email-template");
const {replaceMessageVariables} = require("../util/string-util");

const adminTemplate = {firstName: "Bento Administrator", lastName: ""};

class NotificationsService{

    constructor(dataService, notifyService) {
        this.notifyService = notifyService;
        this.email_constants = undefined
        try {
            this.email_constants = yaml.load(fs.readFileSync('yaml/notification_email_values.yaml', 'utf8'));
        } catch (e) {
            console.error(e)
        }
    }

    async send(fn){
        if (this.email_constants) return await fn();
        console.error("Unable to load email constants from file, email not sent");
    }

    async sendReviewNotification(email, template_params, subject, message, messageVariables) {
        message = replaceMessageVariables(message, messageVariables);
        let template = (template_params.comment && template_params.comment !== "") ?
            "notification-with-comment-template.html" : "notification-template.html";
        return await this.send(async () => {
            await this.notifyService.sendNotification(
                this.email_constants.NOTIFICATION_SENDER,
                subject,
                await createEmailTemplate(template, {
                    message: message, ...template_params
                }),
                email
            );
        });
    }

    async sendAdminNotification(admins, _){
        return await this.send(async () => {
            await this.notifyService.sendNotification(
                this.email_constants.NOTIFICATION_SENDER,
                this.email_constants.ADMIN_NOTIFICATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: this.email_constants.ADMIN_NOTIFICATION_CONTENT, ...adminTemplate
                }),
                admins
            );
        });
    }

    async sendRegistrationConfirmation(email, template_params){
        return await this.send(async () => {
            await this.notifyService.sendNotification(
                this.email_constants.NOTIFICATION_SENDER,
                this.email_constants.CONFIRMATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: this.email_constants.CONFIRMATION_CONTENT, ...template_params
                }),
                email
            );
        });
    }

    async notifyAdminDisableUsers(email, messageVariables){
        let message = replaceMessageVariables(this.email_constants.ADMIN_DISABLE_USER_CONTENT, messageVariables);
        return await this.send(async () => {
            await this.notifyService.sendNotification(
                this.email_constants.NOTIFICATION_SENDER,
                this.email_constants.ADMIN_DISABLE_USER_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: message, ...messageVariables
                }),
                email
            );
        });
    }

    async notifyDisabledUsers(email, messageVariables){
        let message = replaceMessageVariables(this.email_constants.DISABLE_USER_CONTENT, messageVariables);
        return await this.send(async () => {
            await this.notifyService.sendNotification(
                this.email_constants.NOTIFICATION_SENDER,
                this.email_constants.DISABLE_USER_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: message, ...messageVariables
                }),
                email
            );
        });
    }

    async sendApprovalNotification(email, messageVariables, template_params){
        return await this.sendReviewNotification(
            email,
            template_params,
            this.email_constants.DAR_APPROVAL_SUBJECT,
            this.email_constants.DAR_APPROVAL_CONTENT,
            messageVariables
        );
    }

    async sendRejectionNotification(email, messageVariables, template_params){
        return await this.sendReviewNotification(
            email,
            template_params,
            this.email_constants.DAR_REJECTION_SUBJECT,
            this.email_constants.DAR_REJECTION_CONTENT,
            messageVariables
        );
    }

    async sendEditNotification(email, template_params){
        let template = (template_params.comment && template_params.comment !== "") ?
            "notification-with-comment-template.html" : "notification-template.html";
        return await this.send(async () => {
            await this.notifyService.sendNotification(
                this.email_constants.NOTIFICATION_SENDER,
                this.email_constants.EDIT_SUBJECT,
                await createEmailTemplate(template, {
                    message: this.email_constants.EDIT_CONTENT, ...template_params
                }),
                email
            );
        });
    }

    async notifyUserArmAccessRequest(email, messageVariables, template_params){
        let message = replaceMessageVariables(this.email_constants.DAR_CONFIRMATION_CONTENT, messageVariables);
        return await this.send(async () => {
            await this.notifyService.sendNotification(
                this.email_constants.NOTIFICATION_SENDER,
                this.email_constants.DAR_CONFIRMATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: message, ...template_params
                }),
                email
            );
        });
    }

    async notifyAdminArmAccessRequest(email, messageVariables){
        let message = replaceMessageVariables(this.email_constants.DAR_ADMIN_NOTIFICATION_CONTENT, messageVariables);
        return await this.send(async () => {
            await this.notifyService.sendNotification(
                this.email_constants.NOTIFICATION_SENDER,
                this.email_constants.DAR_ADMIN_NOTIFICATION_SUBJECT,
                await createEmailTemplate("notification-template.html", {
                    message: message, ...adminTemplate
                }),
                email
            );
        });
    }

}

module.exports = {
    NotificationsService
}