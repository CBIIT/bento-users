const {v4} = require('uuid')
const neo4j = require('./neo4j-service')
const {errorName, valid_idps} = require("./graphql-api-constants");
const {sendAdminNotification, sendRegistrationConfirmation, sendApprovalNotification, sendRejectionNotification,
    sendEditNotification
} = require("./notifications");
const {STANDARD, REQUESTED} = require("../constants/user-constant");
const {isElementInArray} = require("../util/string-util");
const UserBuilder = require("../model/user");

async function execute(fn) {
    try {
        return await fn();
    } catch (err) {
        return err;
    }
}

async function checkUnique(email, IDP){
    return await neo4j.checkUnique(IDP+":"+email);
}

async function getAdminEmails(){
    return await neo4j.getAdminEmails();
}

async function checkAdminPermissions(userInfo) {
    let result = await neo4j.getMyUser(userInfo);
    try{
        return result.role === 'admin';
    }
    catch (err){
        return false;
    }
}

const getMyUser = async (_, context) => {
    const task = async () => {
        if (!verifyUserInfo(context.userInfo)) throw new Error(errorName.NOT_LOGGED_IN);
        let result = await neo4j.getMyUser(context.userInfo);
        // store user if not exists in db
        if (!result) {
            const user = UserBuilder.createUserFromSession(context.userInfo);
            // no email notification for auto-generated user
            return await registerUser({ userInfo: user.getUserInfo(), isNotify: false });
        }
        return result;
    }
    return await execute(task);
}

const getUser = async (parameters, context) => {
    try {
        let userInfo = context.userInfo;
        if (!verifyUserInfo(userInfo)){
            return new Error(errorName.NOT_LOGGED_IN);
        }
        //Check if not admin
        if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        }
        //Execute query
        else {
            let result =  await neo4j.getUser(parameters);
            return result;
        }
    } catch (err) {
        return err;
    }
}

const listUsers = async (input, context) => {
    try {
        let userInfo = context.userInfo;
        //Check if not admin
        if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        }
        //Execute query
        else {
            return neo4j.listUsers(input);
        }
    } catch (err) {
        return err;
    }
}

const listArms = async (input, context) => {
    try{
        let userInfo = context.userInfo;
        if (!verifyUserInfo(userInfo)){
            return new Error(errorName.NOT_LOGGED_IN);
        }
        else{
            return await neo4j.listArms(input);
        }
    }
    catch (err){
        return err
    }
}

const inspectValidUser = (parameters)=> {
    if (parameters.userInfo && parameters.userInfo.email && parameters.userInfo.idp) {
        let idp = parameters.userInfo.idp;
        if (!isElementInArray(valid_idps, idp)) throw new Error(errorName.INVALID_IDP);
    } else {
        throw new Error(errorName.MISSING_INPUTS);
    }
}

const registerUser = async (parameters, _) => {
    formatParams(parameters.userInfo);
    const task = async () => {
        inspectValidUser(parameters);
        if (!await checkUnique(parameters.userInfo.email, parameters.userInfo.idp)) throw new Error(errorName.NOT_UNIQUE);

        let generatedInfo = {
            userID: v4(),
            registrationDate: (new Date()).toString(),
            status: REQUESTED,
            role: STANDARD
        };
        let registrationInfo = {
            ...parameters.userInfo,
            ...generatedInfo
        };
        let response = await neo4j.registerUser(registrationInfo);
        const notify = (!parameters.isNotify) ? true: parameters.isNotify;
        if (response && notify) {
            let adminEmails = await getAdminEmails();
            let template_params = {
                firstName: response.firstName,
                lastName: response.lastName
            }
            await sendAdminNotification(adminEmails, template_params);
            await sendRegistrationConfirmation(response.email, template_params)
            return response;
        }
        throw new Error(errorName.UNABLE_TO_REGISTER_USER);
    }
    return await execute(task);
}


const approveUser = async (parameters, context) => {
    formatParams(parameters);
    try {
        let userInfo = context.userInfo;
        if (!verifyUserInfo(userInfo)){
            return new Error(errorName.NOT_LOGGED_IN);
        } else if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        } else if (await neo4j.checkAlreadyApproved(parameters.userID)) {
            return new Error(errorName.ALREADY_APPROVED);
        } else if (!(parameters.role === 'admin' || parameters.role === 'standard')){
            return new Error(errorName.INVALID_ROLE);
        }
        else {
            parameters.approvalDate = (new Date()).toString()
            let response = await neo4j.approveUser(parameters)
            if (response) {
                let template_params = {
                    firstName: response.firstName,
                    lastName: response.lastName
                };
                await sendApprovalNotification(response.email, template_params);
                return response;
            } else {
                return new Error(errorName.USER_NOT_FOUND);
            }
        }
    } catch (err) {
        return err;
    }
}


const rejectUser = async (parameters, context) => {
    formatParams(parameters);
    try {
        let userInfo = context.userInfo;
        if (!verifyUserInfo(userInfo)){
            return new Error(errorName.NOT_LOGGED_IN);
        } else if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        } else if (await neo4j.checkAlreadyRejected(parameters.userID)) {
            return new Error(errorName.ALREADY_REJECTED);
        } else {
            parameters.rejectionDate = (new Date()).toString()
            let response = await neo4j.rejectUser(parameters)
            if (response) {
                let template_params = {
                    firstName: response.firstName,
                    lastName: response.lastName,
                    comment: response.comment
                }
                await sendRejectionNotification(response.email, template_params);
                return response;
            } else {
                return new Error(errorName.USER_NOT_FOUND);
            }
        }
    } catch (err) {
        return err;
    }
}


const editUser = async (parameters, context) => {
    formatParams(parameters);
    try {
        let userInfo = context.userInfo;
        if (!userInfo) {
            return new Error(errorName.NOT_LOGGED_IN);
        } else if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        }
        else {
            if (parameters.role) {
                if (!(parameters.role === 'admin' || parameters.role === 'standard')){
                    return new Error(errorName.INVALID_ROLE);
                }
            }
            if (parameters.status) {
                if (!(parameters.status === 'approved' || parameters.status === 'rejected' || parameters.status === 'registered')){
                    return new Error(errorName.INVALID_STATUS);
                }
            }
            parameters.editDate = (new Date()).toString()
            if (parameters.status === 'approved') {
                parameters.approvalDate = parameters.editDate
                let response = await neo4j.approveUser(parameters)
                if (!response) {
                    return new Error(errorName.USER_NOT_FOUND);
                }
            }
            else if (parameters.status === 'rejected') {
                parameters.rejectionDate = parameters.editDate
                let response = await neo4j.rejectUser(parameters)
                if (!response) {
                    return new Error(errorName.USER_NOT_FOUND);
                }
            }
            else if (parameters.status === 'registered') {
                let response = await neo4j.resetApproval(parameters)
                if (!response) {
                    return new Error(errorName.USER_NOT_FOUND);
                }
            }
            let response = await neo4j.editUser(parameters)
            if (response) {
                let template_params = {
                    firstName: response.firstName,
                    lastName: response.lastName,
                    comment: response.comment
                }
                await sendEditNotification(response.email, template_params);
                return response;
            } else {
                return new Error(errorName.USER_NOT_FOUND);
            }
        }
    } catch (err) {
        return err;
    }
}

function formatParams(params){
    if (params.email){
        params.email = params.email.toLowerCase();
    }
    if (params.role){
        params.role = params.role.toLowerCase();
    }
    if (params.status){
        params.status = params.status.toLowerCase();
    }
}

function verifyUserInfo(userInfo) {
    return userInfo && userInfo.email && userInfo.idp;
}

// const updateMyUser = (input, context) => {
//     try{
//         let userInfo = context.session.userInfo;
//         input.userInfo.email = userInfo.email;
//         input.userInfo.editDate = (new Date()).toString();
//         return neo4j.updateMyUser(input.userInfo);
//     }
//     catch (err) {
//         return err;
//     }
// }
// const deleteUser = (parameters, context) => {
//     try{
//         let userInfo = context.session.userInfo;
//         if (checkAdminPermissions(userInfo)) {
//             return neo4j.deleteUser(parameters)
//         }
//         else{
//             new Error(errorName.NOT_AUTHORIZED)
//         }
//     }
//     catch (err) {
//         return err;
//     }
// }
//
// const disableUser = (parameters, context) => {
//     try{
//         let userInfo = context.session.userInfo;
//         if (checkAdminPermissions(userInfo)) {
//             return neo4j.disableUser(parameters)
//         }
//         else{
//             new Error(errorName.NOT_AUTHORIZED)
//         }
//     }
//     catch (err) {
//         return err;
//     }
// }


module.exports = {
    getMyUser: getMyUser,
    getUser: getUser,
    listUsers: listUsers,
    registerUser: registerUser,
    approveUser: approveUser,
    rejectUser: rejectUser,
    editUser: editUser,
    listArms: listArms,
    // updateMyUser: updateMyUser,
    // deleteUser: deleteUser,
    // disableUser: disableUser,
}