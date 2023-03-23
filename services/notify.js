const { createTransport } = require('nodemailer');
const config = require('../config');

class NotifyService {

    constructor(dataService) {
        this.dataService = dataService;
    }

    async sendNotification(from, subject, html, to = [], cc = [], bcc = []) {

        if (!to?.length) {
            throw new Error('Missing recipient');
        }

        if (!html) {
            throw new Error('Missing HTML CONTENTS');
        }

        to = this.asArray(to);
        cc = this.asArray(cc);
        bcc = this.asArray(bcc);

        return await this.sendMail({ from, to, cc, bcc, subject, html });
    }

    async sendMail(params) {
        const transport = createTransport(config.email_transport);
        console.log("Generating email to: "+params.to.join(', '));
        if (config.emails_enabled){
            try{
                let result = await transport.sendMail(params);
                console.log("Email sent");
                return result;
            }
            catch (err){
                console.error("Email failed to send with ths following reason:" + err.message);
                return err;
            }
        }
        else {
            console.log("Email not sent, email is disabled by configuration");
            return true;
        }
    }

    asArray(values = []) {
        return Array.isArray(values)
            ? values
            : [values];
    }

    async notifyTemplate(email, firstName, lastName, messageVariables, sendAdmin, sendUser){
        // send admin notification
        const notifyAdmin = async () => {
            if (sendAdmin) {
                const adminEmails = await this.dataService.getAdminEmails();
                if (adminEmails && adminEmails.length > 0) {
                    await sendAdmin(adminEmails, messageVariables);
                }
                else {
                    console.error("No admins found, please verify that at least one administrator user exists");
                }
            }
        }

        const notifyUser = async () => {
            if (sendUser)  {
                await sendUser(email, messageVariables, {
                    firstName: firstName,
                    lastName: lastName
                })
            }
        }
        await Promise.all([notifyAdmin(), notifyUser()])
    }

}

module.exports = {NotifyService}
