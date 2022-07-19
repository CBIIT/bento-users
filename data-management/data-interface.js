const {v4} = require('uuid')
const neo4j = require('./neo4j-service')
const {errorName, valid_idps, user_roles, user_statuses} = require("./graphql-api-constants");
const {sendAdminNotification, sendRegistrationConfirmation, sendApprovalNotification, sendRejectionNotification,
    sendEditNotification
} = require("./notifications");
const {NONE, NON_MEMBER} = require("../constants/user-constant");
const {isElementInArray, getUniqueArr} = require("../util/string-util");
const UserBuilder = require("../model/user");
const ArmAccess = require("../model/arm-access");
const {searchValidRequestArm} = require("./neo4j-service");

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
            const user = UserBuilder.createUser(context.userInfo);
            // no email notification for auto-generated user
            return await registerUser({ userInfo: user.getUserInfo(), isNotify: false }, context);
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
        //Check logged in
        if (!verifyUserInfo(userInfo)){
            return new Error(errorName.NOT_LOGGED_IN);
        }
        //Check if not admin
        else if (!await checkAdminPermissions(userInfo)) {
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

const inspectValidUserOrThrow = (parameters)=> {
    if (validator.isValidLogin(parameters.userInfo)) {
        validator.isValidIdpOrThrow(parameters.userInfo.idp);
    } else {
        throw new Error(errorName.MISSING_INPUTS);
    }
}

const validator = {
    isValidReqArmInputOrThrow: (p)=>{
        if (!p.userInfo.firstName || !p.userInfo.lastName || !p.userInfo.armIDs) throw new Error(errorName.MISSING_ARM_REQUEST_INPUTS)
    },
    isValidLogin: (userInfo) => {
        return verifyUserInfo(userInfo);
    },
    isValidLoginOrThrow: (userInfo) => {
        if (!verifyUserInfo(userInfo)) throw new Error(errorName.NOT_LOGGED_IN);
    },
    isValidArmOrThrow: (arms, armIDs) => {
        if (arms.length === 0 || arms.length != armIDs.length) throw new Error(errorName.INVALID_REQUEST_ARM);
    },
    isValidIdpOrThrow: (idp)=> {
        let copyIdp = idp.slice();
        if (!isElementInArray(valid_idps, copyIdp)) throw new Error(errorName.INVALID_IDP)
    }
}

async function requestAccess(parameters, context) {
    validator.isValidLoginOrThrow(context.userInfo);
    validator.isValidReqArmInputOrThrow(parameters) ;
    const aUser = await neo4j.getMyUser(context.userInfo);
    parameters.userID = aUser.userID;
    parameters.userInfo.armIDs = getUniqueArr(parameters.userInfo.armIDs);

    // inspect request-arms in the existing arms
    const arms = await searchArms({armIDs: parameters.userInfo.armIDs},context);
    validator.isValidArmOrThrow(arms, parameters.userInfo.armIDs);

    // create request arm access
    const accessRequest = await addArmRequestAccess(parameters, context);
    if (accessRequest) {
        await updateUserName(parameters, context);
        return await neo4j.getUser(parameters);
    }
    throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
}

const searchArms = async (arrArm, context) => {
    const user = UserBuilder.createUser(context.userInfo);
    const task = async () => { return await searchValidRequestArm(arrArm, user); };
    return await execute(task);
}

const updateUserName = async (parameters, context) => {
    const task = async () => {
        inspectValidUserOrThrow(context);
        const user = UserBuilder.createUser(parameters.userInfo);
        let response = await neo4j.updateUserName(parameters, user)
        if (response) return response;
        throw new Error(errorName.USER_NOT_FOUND);
    }
    return execute(await task);
}

const addArmRequestAccess = async (parameters, context) => {
    let userSession = JSON.parse(JSON.stringify(context));
    formatParams(userSession);
    inspectValidUserOrThrow(userSession);
    const task = async () => {
        const armAccess = ArmAccess.createRequestAccess(parameters.userID, parameters.userInfo.armIDs)
        const response = await neo4j.requestArmAccess(armAccess.getArmAccess());
        if (response) {
            setImmediate(async () => {
                // TODO send admin arm access notification
                // TODO send user arm request notification
            });
        }
        if (response) return response;
        throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
    }
    return await execute(task);
}

const registerUser = async (parameters, _) => {
    formatParams(parameters.userInfo);
    const task = async () => {
        inspectValidUserOrThrow(parameters);
        if (!await checkUnique(parameters.userInfo.email, parameters.userInfo.idp)) throw new Error(errorName.NOT_UNIQUE);

        let generatedInfo = {
            userID: v4(),
            status: NONE,
            role: NON_MEMBER
        };
        let registrationInfo = {
            ...parameters.userInfo,
            ...generatedInfo
        };
        let response = await neo4j.registerUser(registrationInfo);
        const notify = (parameters.isNotify === false) ? parameters.isNotify: true;
        if (response && notify) {
            setImmediate(async () => {
                let adminEmails = await getAdminEmails();
                let template_params = {
                    firstName: response.firstName,
                    lastName: response.lastName
                }
                await sendAdminNotification(adminEmails, template_params);
                await sendRegistrationConfirmation(response.email, template_params)
            });
        }
        if (response) return response;
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
            if (parameters.role && !user_roles.includes(parameters.role)) {
                return new Error(errorName.INVALID_ROLE);
            }
            if (parameters.userStatus !== "" && parameters.userStatus && !user_statuses.includes(parameters.userStatus)) {
                return new Error(errorName.INVALID_STATUS);
            }
            parameters.editDate = (new Date()).toString();
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

const updateMyUser = async (parameters, context) => {
    formatParams(parameters);
    try {
        let userInfo = context.userInfo;
        if (!userInfo) {
            return new Error(errorName.NOT_LOGGED_IN);
        }
        else{
            parameters = {...userInfo, ...parameters.userInfo};
            parameters.editDate = (new Date()).toString()
            return await neo4j.updateMyUser(parameters, userInfo);
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
    if (params.userStatus){
        params.userStatus = params.userStatus.toLowerCase();
    }
    if (params.accessStatus){
        params.accessStatus = params.accessStatus.toLowerCase();
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
    updateMyUser: updateMyUser,
    searchArms,
    requestAccess,
    updateUserName
    // deleteUser: deleteUser,
    // disableUser: disableUser,
}