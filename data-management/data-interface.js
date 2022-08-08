const {v4} = require('uuid')
const neo4j = require('./neo4j-service')
const {errorName, user_roles, user_statuses} = require("./graphql-api-constants");
const {sendAdminNotification, sendRegistrationConfirmation, sendApprovalNotification, sendRejectionNotification,
    sendEditNotification, notifyUserArmAccessRequest, notifyAdminArmAccessRequest
} = require("./notifications");
const {NONE, NON_MEMBER} = require("../constants/user-constant");
const {getUniqueArr} = require("../util/string-util");
const UserBuilder = require("../model/user");
const config = require('../config');
const ArmAccess = require("../model/arm-access");
const {notifyTemplate} = require("../services/notify");
const yaml = require('js-yaml');
const fs = require('fs');
const LoginCondition = require("../model/valid-conditions/login-condition");
const {ArmRequestParamsCondition, ArmExistCondition} = require("../model/valid-conditions/arm-conditions");
const idpCondition = require("../model/valid-conditions/idp-condition");
const {saveUserInfoToSession} = require("../services/session");
const GeneralUserCondition = require("../model/valid-conditions/general-user-condition");
const {PENDING, REJECTED, REVOKED, APPROVED} = require("../constants/access-constant");
const AdminCondition = require("../model/valid-conditions/admin-conditions");
const {UserRoleCondition, UserStatusCondition} = require("../model/valid-conditions/user-condition");

async function checkUnique(email, IDP){
    return await neo4j.checkUnique(IDP+":"+email);
}

async function validateInputArms(userID, accessList, accessStatuses) {
    let existingAccess = await neo4j.getAccesses(userID, accessStatuses);
    return accessList.every((a)=>existingAccess.includes(a))
}

const isValidOrThrow = (conditions) => {
    conditions.forEach((condition)=> {
        if (!condition.isValid()) condition.throwError();
    });
}

const getMyUser = async (_, context) => {
    isValidOrThrow([new LoginCondition(context.userInfo)]);
    let result = await neo4j.getMyUser(context.userInfo);
    // store user if not exists in db
    if (!result) {
        saveUserInfoToSession(context, context.userInfo);
        // no email notification for auto-generated user
        const user = UserBuilder.createUser(context.userInfo);
        return await registerUser({ userInfo: user.getUserInfo(), isNotify: false }, context);
    }
    saveUserInfoToSession(context, result);
    return result;
}

const getUser = async (parameters, context) => {
    try {
        isValidOrThrow([new LoginCondition(context.userInfo), new AdminCondition(context.userInfo)])
        //Execute query
        return await neo4j.getUser(parameters);
    } catch (err) {
        return err;
    }
}

const listUsers = async (input, context) => {
    try {
        isValidOrThrow([new LoginCondition(context.userInfo), new AdminCondition(context.userInfo)]);
        return neo4j.listUsers(input);
    } catch (err) {
        return err;
    }
}

const listArms = async (input, context) => {
    try{
        isValidOrThrow([new LoginCondition(context.userInfo)]);
        return await neo4j.listArms(input);
    }
    catch (err){
        return err
    }
}

async function requestAccess(parameters, context) {
    isValidOrThrow([new LoginCondition(context.userInfo), new ArmRequestParamsCondition(parameters)]);
    const reqArmIDs = getUniqueArr(parameters.userInfo.armIDs);
    // inspect request-arms in the existing arms
    const arms = await searchValidReqArms({armIDs: reqArmIDs}, context);
    isValidOrThrow([new ArmExistCondition(arms, reqArmIDs)]);

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

const rejectAdminArmRequest = (userInfo)=> {
    const generalUserCondition = new GeneralUserCondition(userInfo);
    generalUserCondition.throwError = ()=> { throw new Error(errorName.INVALID_ADMIN_ARM_REQUEST); };
    return generalUserCondition;
}

const addArmRequestAccess = async (armIDs, context) => {
    formatParams(context);
    isValidOrThrow([new idpCondition(context.userInfo), rejectAdminArmRequest(context.userInfo)]);
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
    isValidOrThrow([new idpCondition(parameters.userInfo)]);
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


const approveAccess = async (parameters, context) => {
    try {
        isValidOrThrow([new LoginCondition(context.userInfo), new AdminCondition(context.userInfo)]);
        if (!await validateInputArms(parameters.userID, parameters.armIDs, [PENDING, REJECTED, REVOKED])){
            return new Error(errorName.INVALID_REVIEW_ARMS);
        } else {
            let userInfo = context.userInfo;
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
        isValidOrThrow([new LoginCondition(context.userInfo), new AdminCondition(context.userInfo)]);
        if (!await validateInputArms(parameters.userID, parameters.armIDs, [PENDING])){
            return new Error(errorName.INVALID_REVIEW_ARMS);
        } else {
            let userInfo = context.userInfo;
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
        isValidOrThrow([new LoginCondition(context.userInfo), new AdminCondition(context.userInfo)]);
        if (!await validateInputArms(parameters.userID, parameters.armIDs, [APPROVED])){
            return new Error(errorName.INVALID_REVOKE_ARMS);
        } else {
            let userInfo = context.userInfo;
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
        isValidOrThrow([new LoginCondition(context.userInfo), new AdminCondition(context.userInfo), new UserRoleCondition(parameters.role), new UserStatusCondition(parameters.userStatus)]);
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
    } catch (err) {
        return err;
    }
}

const updateMyUser = async (parameters, context) => {
    formatParams(parameters);
    isValidOrThrow([new LoginCondition(context.userInfo)]);
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