const { createTransport } = require('nodemailer');
const config = require('../config');
const {getAdminEmails} = require("../data-management/neo4j-service");

async function sendNotification(from, subject, html, to = [], cc = [], bcc = []) {

    if (!to?.length) {
        throw new Error('Missing recipient');
    }

    if (!html) {
        throw new Error('Missing HTML CONTENTS');
    }

    to = asArray(to);
    cc = asArray(cc);
    bcc = asArray(bcc);

    return await sendMail({ from, to, cc, bcc, subject, html });
}

async function sendMail(params) {
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

function asArray(values = []) {
    return Array.isArray(values)
        ? values
        : [values];
}

const notifyTemplate = async (userInfo, sendAdmin, sendUser) => {
    // send admin notification
    const notifyAdmin = async () => {
        if (sendAdmin) {
            const adminEmails = await getAdminEmails();
            if (adminEmails && adminEmails.length > 0) await sendAdmin(adminEmails, {});
            else console.error("Admin email is not found, please check if administrator user existed");
        }
    }

    const notifyUser = async () => {
        if (sendUser)  {
            await sendUser(userInfo.email, {
                firstName: userInfo.firstName,
                lastName: userInfo.lastName
            })
        }
    }
    await Promise.all([notifyAdmin(), notifyUser()])
}

module.exports = { sendNotification, notifyTemplate }
