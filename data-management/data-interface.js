const {v4} = require('uuid')
const neo4j = require('./neo4j-service')
const {errorName, valid_idps, user_roles, user_statuses} = require("./graphql-api-constants");
const {sendAdminNotification, sendRegistrationConfirmation, sendApprovalNotification, sendRejectionNotification,
    sendEditNotification, notifyUserArmAccessRequest, notifyAdminArmAccessRequest
} = require("./notifications");
const {NONE, NON_MEMBER} = require("../constants/user-constant");
const {isElementInArray, getUniqueArr} = require("../util/string-util");
const UserBuilder = require("../model/user");
const config = require('../config');
const ArmAccess = require("../model/arm-access");
const {notifyTemplate} = require("../services/notify");
const yaml = require('js-yaml');
const fs = require('fs');
const Session = require("../model/session");


async function execute(fn) {
    try {
        return await fn();
    } catch (err) {
        throw err;
    }
}

async function checkUnique(email, IDP){
    return await neo4j.checkUnique(IDP+":"+email);
}

async function validateInputArms(userID, accessList, accessStatuses) {
    let existingAccess = await neo4j.getAccesses(userID, accessStatuses);
    return accessList.every((a)=>existingAccess.includes(a))
}

async function checkAdminPermissions(userInfo) {
    let result = await neo4j.getMyUser(userInfo);
    try{
        return result.role === 'admin' && result.userStatus === 'active';
    }
    catch (err){
        return false;
    }
}

const validator = {
    isValidLoginOrThrow: (userInfo) => {
        if (!verifyUserInfo(userInfo)) throw new Error(errorName.NOT_LOGGED_IN);
    },
    isValidLogin: (userInfo) => {
        return verifyUserInfo(userInfo);
    },
    isValidArmOrThrow: (arms, armIDs) => {
        if (arms.length === 0 || arms.length != armIDs.length) throw new Error(errorName.INVALID_REQUEST_ARM);
    },
    isValidIdpOrThrow: (idp)=> {
        let copyIdp = idp.slice();
        if (!isElementInArray(valid_idps, copyIdp)) throw new Error(errorName.INVALID_IDP)
    },
    isValidReqArmInputOrThrow: (p)=> { // only a list of arm ids required
        if (!p.userInfo.armIDs) throw new Error(errorName.MISSING_ARM_REQUEST_INPUTS)
    }
}

const getMyUser = async (_, context) => {
    const task = async () => {
        if (!verifyUserInfo(context.userInfo)) throw new Error(errorName.NOT_LOGGED_IN);
        let result = await neo4j.getMyUser(context.userInfo);
        Session.saveUserInfo(context, result);
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

async function requestAccess(parameters, context) {
    validator.isValidLoginOrThrow(context.userInfo);
    validator.isValidReqArmInputOrThrow(parameters) ;

    const reqArmIDs = getUniqueArr(parameters.userInfo.armIDs);
    // inspect request-arms in the existing arms
    const arms = await searchValidReqArms({armIDs: reqArmIDs}, context);
    validator.isValidArmOrThrow(arms, reqArmIDs);

    // create request arm access
    const accessRequest = await addArmRequestAccess(reqArmIDs, context);
    if (accessRequest) return await updateMyUser(parameters, context);
    throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
}

const searchValidReqArms = async (parameters, context) => {
    const user = UserBuilder.createUser(context.userInfo);
    return await neo4j.searchValidRequestArm({...parameters, invalidStatus: ArmAccess.rejectRequestAccessStatus() }, user);
}

const createReqArmParams = (armIDs) => {
    const listParameters = [];
    const arms = Array.isArray(armIDs) ? armIDs : [armIDs];
    arms.forEach((armID)=> {
        const aArm = ArmAccess.createRequestAccess();
        listParameters.push({armID: armID, accessStatus: aArm.getAccessStatus(), reqID: aArm.getRequestID()});
    });
    return listParameters;
}

const addArmRequestAccess = async (armIDs, context) => {
    formatParams(context);
    inspectValidUserOrThrow(context);
    const response = await neo4j.requestArmAccess(createReqArmParams(armIDs), context.userInfo);
    // Send email notification after success
    if (response) await notifyTemplate(context.userInfo, notifyAdminArmAccessRequest, notifyUserArmAccessRequest);
    if (response) return response;
    throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
}

const seedInit = async () => {
    //Check admins
    let seedData = undefined;
    if ((await neo4j.getAdminEmails()).length < 1){
        try{
            seedData = yaml.load(fs.readFileSync(config.seed_data_file, 'utf8'));
            let admin = {...seedData.admin, ...{userID: v4(), role: 'admin', status: 'active'}};
            formatParams(admin);
            await neo4j.registerUser(admin);
            console.log("Seed admin initialized in database");
        } catch (err){
            console.error("Seed admin initialization failed: "+err);
        }
    }
    if ((await neo4j.listArms()).length < 1){
       try{
           if (seedData === undefined){
               seedData = yaml.load(fs.readFileSync(config.seed_data_file, 'utf8'));
           }
           let arms = seedData.arms;
           await neo4j.createArms(arms);
           console.log("Seed arms initialized in database");
       } catch (err){
           console.error("Seed arms initialization failed: "+err);
       }
    }
    //Check arms
}

const registerUser = async (parameters, context) => {
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
        // Send email notification after success
        if (response && notify) await notifyTemplate(context.userInfo, sendAdminNotification, sendRegistrationConfirmation);
        if (response) return response;
        throw new Error(errorName.UNABLE_TO_REGISTER_USER);
    }
    return await execute(task);
}


const approveAccess = async (parameters, context) => {
    try {
        let userInfo = context.userInfo;
        if (!verifyUserInfo(userInfo)){
            return new Error(errorName.NOT_LOGGED_IN);
        } else if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        } else if (!await validateInputArms(parameters.userID, parameters.armIDs, ['requested', 'rejected', 'revoked'])){
            return new Error(errorName.INVALID_REVIEW_ARMS);
        }
        else {
            parameters.reviewDate = (new Date()).toString();
            parameters.reviewerEmail = userInfo.email;
            parameters.reviewerIDP = userInfo.idp;
            let response = await neo4j.approveAccess(parameters)
            if (config.emails_enabled && response) {
                let userData = await neo4j.getUser({userID: parameters.userID});
                let template_params = {
                    firstName: userData.firstName,
                    lastName: userData.lastName
                }
                await sendApprovalNotification(userData.email, template_params);
            }
            return response;
        }
    } catch (err) {
        return err;
    }
}


const rejectAccess = async (parameters, context) => {
    try {
        let userInfo = context.userInfo;
        if (!verifyUserInfo(userInfo)){
            return new Error(errorName.NOT_LOGGED_IN);
        } else if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        } else if (!await validateInputArms(parameters.userID, parameters.armIDs, ['requested'])){
            return new Error(errorName.INVALID_REVIEW_ARMS);
        }
        else {
            parameters.reviewDate = (new Date()).toString();
            parameters.reviewerEmail = userInfo.email;
            parameters.reviewerIDP = userInfo.idp;
            let response = await neo4j.rejectAccess(parameters)
            if (config.emails_enabled && response) {
                let userData = await neo4j.getUser({userID: parameters.userID});
                let template_params = {
                    firstName: userData.firstName,
                    lastName: userData.lastName
                }
                await sendRejectionNotification(userData.email, template_params);
            }
            return response;
        }
    } catch (err) {
        return err;
    }
}

const revokeAccess = async (parameters, context) => {
    try{
        let userInfo = context.userInfo;
        if (!userInfo) {
            return new Error(errorName.NOT_LOGGED_IN);
        } else if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        } else if (!await validateInputArms(parameters.userID, parameters.armIDs, ['approved'])){
            return new Error(errorName.INVALID_REVOKE_ARMS);
        }
        else {
            parameters.reviewDate = (new Date()).toString();
            parameters.reviewerEmail = userInfo.email;
            parameters.reviewerIDP = userInfo.idp;
            let response = await neo4j.revokeAccess(parameters)
            if (config.emails_enabled && response) {
                // todo implement email notification
                // await sendRevokedNotification(response.email, template_params);
                return response;
            }
            return response;
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
        } else {
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
    validator.isValidLoginOrThrow(context.userInfo);
    return await neo4j.updateMyUser({...parameters.userInfo}, {...context.userInfo});
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
    if (params.idp){
        params.idp = params.idp.toLowerCase();
    }
}

function verifyUserInfo(userInfo) {
    return userInfo && userInfo.email && userInfo.idp;
}

module.exports = {
    getMyUser: getMyUser,
    getUser: getUser,
    listUsers: listUsers,
    registerUser: registerUser,
    rejectAccess: rejectAccess,
    editUser: editUser,
    listArms: listArms,
    revokeAccess: revokeAccess,
    approveAccess: approveAccess,
    updateMyUser: updateMyUser,
    searchValidReqArms,
    requestAccess,
    seedInit: seedInit
    // updateMyUser: updateMyUser,
    // deleteUser: deleteUser,
    // disableUser: disableUser,
}