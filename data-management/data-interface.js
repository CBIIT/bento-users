const {v4} = require('uuid')
const neo4j = require('./neo4j-service')
const {errorName, user_roles, user_statuses} = require("./graphql-api-constants");
const {sendAdminNotification, sendRegistrationConfirmation, sendApprovalNotification, sendRejectionNotification,
    sendEditNotification, notifyUserArmAccessRequest, notifyAdminArmAccessRequest
} = require("./notifications");
const {NONE, NON_MEMBER, ADMIN, MEMBER, ACTIVE, INACTIVE} = require("../constants/user-constant");
const {getUniqueArr, isCaseInsensitiveEqual, isElementInArrayCaseInsensitive} = require("../util/string-util");
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
const {getApprovedArmIDs} = require("../services/arm-access");

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
        return isCaseInsensitiveEqual(result.role, ADMIN) && isCaseInsensitiveEqual(result.userStatus, ACTIVE);
    }
    catch (err){
        return false;
    }
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

async function requestAccess(parameters, context) {
    // Validate login and parameters
    isValidOrThrow([new LoginCondition(context.userInfo), new ArmRequestParamsCondition(parameters)]);
    // Get unique list of arm ids
    const reqArmIDs = getUniqueArr(parameters.userInfo.armIDs);
    const arms = await searchValidReqArms({armIDs: reqArmIDs}, context);
    isValidOrThrow([new ArmExistCondition(arms, reqArmIDs)]);
    // Create Arm Access Requests
    const addArmRequestAccessResponse = await addArmRequestAccess(reqArmIDs, context);
    if (addArmRequestAccessResponse) {
        // Update the user's info
        let updateMyUserResponse  = await updateMyUser(parameters, context);
        // Send email notifications
        if (config.emails_enabled) {
            try{
                let arms = await neo4j.getArmNamesFromArmIds(reqArmIDs);
                let messageVariables = {
                    "$arms": arms.join(", "),
                    "$user": `${context.userInfo.firstName} ${context.userInfo.lastName}`
                }
                await notifyTemplate(context.userInfo, messageVariables, notifyAdminArmAccessRequest, notifyUserArmAccessRequest);
            }
            catch (err) {
                console.error("Failed to send notification email: "+err);
            }
        }
        // Return the user's information
        return updateMyUserResponse;
    }
    else{
        throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
    }
}

const searchValidReqArms = async (parameters, context) => {
    const user = UserBuilder.createUser(context.userInfo);
    return await neo4j.searchValidRequestArm({...parameters, invalidStatus: ArmAccess.rejectRequestAccessStatus() }, user);
}

const createReqArmParams = (armIDs) => {
    const listParameters = [];
    const arms = Array.isArray(armIDs) ? armIDs : [armIDs];
    const requestID = v4();
    const accessStatus = PENDING;
    arms.forEach((armID)=> {
        listParameters.push({armID: armID, accessStatus: accessStatus, requestID: requestID});
    });
    return listParameters;
}

const rejectAdminArmRequest = (userInfo)=> {
    const generalUserCondition = new GeneralUserCondition(userInfo);
    generalUserCondition.throwError = ()=> { throw new Error(errorName.INVALID_ADMIN_ARM_REQUEST); };
    return generalUserCondition;
}

const addArmRequestAccess = async (armIDs, context) => {
    isValidOrThrow([new idpCondition(context.userInfo), rejectAdminArmRequest(context.userInfo)]);
    const response = await neo4j.requestArmAccess(createReqArmParams(armIDs), context.userInfo);
    if (response) {
        return response;
    }
    else{
        throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
    }
}

const seedInit = async () => {
    let seedData = undefined;
    if ((await neo4j.getAdminEmails()).length < 1){
        try{
            seedData = yaml.load(fs.readFileSync(config.seed_data_file, 'utf8'));
            let admin = {...seedData.admin, ...{userID: v4(), role: ADMIN, status: ACTIVE}};
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
}

const registerUser = async (parameters, context) => {
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
        let userInfo = context.userInfo;
        if (!verifyUserInfo(userInfo)){
            return new Error(errorName.NOT_LOGGED_IN);
        } else if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        } else if (!await validateInputArms(parameters.userID, parameters.armIDs, [PENDING, REJECTED, REVOKED])){
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
                    lastName: userData.lastName,
                    comment: parameters.comment,
                }
                let armIds = await neo4j.getArmNamesFromArmIds(parameters.armIDs);
                let messageVariables = {
                    "$arms": armIds.join(", ")
                }
                await sendApprovalNotification(userData.email, messageVariables, template_params);
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
        } else if (!await validateInputArms(parameters.userID, parameters.armIDs, [PENDING])){
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
                    lastName: userData.lastName,
                    comment: parameters.comment,
                }
                let armIds = await neo4j.getArmNamesFromArmIds(parameters.armIDs);
                let messageVariables = {
                    "$arms": armIds.join(", ")
                }
                await sendRejectionNotification(userData.email, messageVariables, template_params);
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
        } else if (!await validateInputArms(parameters.userID, parameters.armIDs, [APPROVED])){
            return new Error(errorName.INVALID_REVOKE_ARMS);
        }
        else {
            parameters.reviewDate = (new Date()).toString();
            parameters.reviewerEmail = userInfo.email;
            parameters.reviewerIDP = userInfo.idp;
            let response = await neo4j.revokeAccess(parameters)
            if (config.emails_enabled && response) {
                // todo implement email notification
            }
            return response;
        }
    } catch (err) {
        return err;
    }
}

const disableAdmin = async (userID, params, context) => {
    const aUser = await getUser({userID: userID}, context);
    const userParams = {};
    const isAdminUser = isCaseInsensitiveEqual(aUser.role, ADMIN);
    const isAdminRevoke = isElementInArrayCaseInsensitive(user_roles, params.role) && !isCaseInsensitiveEqual(params.role, ADMIN);
    if (isAdminUser && isAdminRevoke) {
        // check approved ACLs
        const armArray = ArmAccess.createArmAccessArray(aUser.acl);
        userParams.userStatus = getApprovedArmIDs(armArray).length > 0 ? ACTIVE : INACTIVE;
        // The user becomes a member after removing admin role
        userParams.role = MEMBER;
    }
    return userParams;
}

const editUser = async (parameters, context) => {
    try {
        let userInfo = context.userInfo;
        if (!userInfo) {
            return new Error(errorName.NOT_LOGGED_IN);
        } else if (!await checkAdminPermissions(userInfo)) {
            return new Error(errorName.NOT_AUTHORIZED);
        } else {
            if (parameters.role && !isElementInArrayCaseInsensitive(user_roles, parameters.role)) {
                return new Error(errorName.INVALID_ROLE);
            }
            if (parameters.userStatus !== "" && parameters.userStatus && !isElementInArrayCaseInsensitive(user_statuses, parameters.userStatus)) {
                return new Error(errorName.INVALID_STATUS);
            }
            parameters.editDate = (new Date()).toString();

            const adminUserParams = await disableAdmin(parameters.userID, parameters, context);
            let response = await neo4j.editUser({...parameters,...adminUserParams});
            if (response) {
                let template_params = {
                    firstName: response.firstName,
                    lastName: response.lastName,
                    comment: parameters.comment,
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
    isValidOrThrow([new LoginCondition(context.userInfo)]);
    let result = await neo4j.updateMyUser(parameters.userInfo, context.userInfo);
    context.userInfo = {...context.userInfo, ...parameters.userInfo};
    return result;
}

function verifyUserInfo(userInfo) {
    return userInfo && userInfo.email && userInfo.idp;
}

const listRequest = async (params, context) => {
    let userInfo = context.userInfo;
    //Check logged in
    if (!verifyUserInfo(userInfo)) {
        return new Error(errorName.NOT_LOGGED_IN);
    }
    //Check if not admin
    else if (!await checkAdminPermissions(userInfo)) {
        return new Error(errorName.NOT_AUTHORIZED);
    }
    //Execute query
    else {
        return neo4j.listRequest(params);
    }
}

const disableInactiveUsers = async () => {
    const users = await neo4j.getInactiveUsers();
    if (users) {
        let disableAdminIDs = [];
        let disableUserIDs = [];
        users.forEach((user)=> {
            if (isCaseInsensitiveEqual(user.role, ADMIN)) {
                disableAdminIDs.push(user.userID);
            }
            disableUserIDs.push(user.userID);
        });
        // Disable inactive users
        if (disableUserIDs.length > 0) {
            const disabledUsers = await neo4j.disableUsers({ids: disableUserIDs});
            if (!disabledUsers && disabledUsers.length == 0)
                console.error("Disabling users failed");
        }

        // Disable admin ids
        if (disableAdminIDs.length > 0) {
            const disabledAdmins = await neo4j.disableAdminRole({ids: disableAdminIDs}, MEMBER);
            if (!disabledAdmins && disabledAdmins.length == 0)
                console.error("Changing the admin role failed");
        }
    }
    // TODO email notification
    return users;
}

module.exports = {
    getMyUser,
    getUser,
    listUsers,
    registerUser,
    rejectAccess,
    editUser,
    listArms,
    revokeAccess,
    approveAccess,
    updateMyUser,
    searchValidReqArms,
    requestAccess,
    seedInit,
    listRequest,
    disableInactiveUsers
    // deleteUser: deleteUser,
    // disableUser: disableUser,
}