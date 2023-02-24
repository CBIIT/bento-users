const {v4} = require('uuid')
const neo4j = require('./neo4j-service')
const {errorName} = require("./graphql-api-constants");
const {sendAdminNotification, sendRegistrationConfirmation, sendApprovalNotification, sendRejectionNotification,
    sendEditNotification, notifyUserArmAccessRequest, notifyAdminArmAccessRequest
} = require("./notifications");
const {NONE, NON_MEMBER, ADMIN, MEMBER, ACTIVE, INACTIVE, NOT_APPLICABLE} = require("../bento-event-logging/const/user-constant");
const {getUniqueArr, isCaseInsensitiveEqual, isElementInArrayCaseInsensitive, isElementInArray} = require("../util/string-util");
const config = require('../config');
const ArmAccess = require("../model/arm-access");
const {notifyTemplate} = require("../services/notify");
const yaml = require('js-yaml');
const fs = require('fs');
const fsp = fs.promises;
const LoginCondition = require("../model/valid-conditions/login-condition");
const {ArmRequestParamsCondition, ArmExistCondition, ArmReqUserStatusCondition} = require("../model/valid-conditions/arm-conditions");
const idpCondition = require("../model/valid-conditions/idp-condition");
const GeneralUserCondition = require("../model/valid-conditions/general-user-condition");
const {PENDING, REJECTED, REVOKED, APPROVED} = require("../bento-event-logging/const/access-constant");
const {getApprovedArmIDs} = require("../services/arm-access");
const {logRequestArmAccess, logRegisterUser, logReview, logEditUser, logDisableUser} = require("./event-logging");
const {disableNotification} = require("../services/notify-user");
const {user_statuses, user_roles} = require("../bento-event-logging/const/format-constants");
const moment = require("moment");
const path = require("path");

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
    let loginInfo = context.userInfo;
    isValidOrThrow([
        new LoginCondition(loginInfo.email, loginInfo.IDP)
    ]);
    let activeUser = await neo4j.getMyUser(loginInfo);
    // store user if not exists in db
    if (!activeUser) {
        activeUser =  await registerUser(loginInfo.firstName, loginInfo.lastName, loginInfo.email, loginInfo.IDP, false);
    }
    updateUserInSession(context, activeUser);
    return activeUser;
}

const getUser = async (parameters, context) => {
    let activeUser = context.userInfo;
    if (!verifyUserInfo(activeUser)){
        throw new Error(errorName.NOT_LOGGED_IN);
    }
    //Check if not admin
    if (!await checkAdminPermissions(activeUser)) {
        throw new Error(errorName.NOT_AUTHORIZED);
    }
    return await neo4j.getUserByID(parameters.userID);
}

const listUsers = async (input, context) => {
    let activeUser = context.userInfo;
    //Check logged in
    if (!verifyUserInfo(activeUser)){
        throw new Error(errorName.NOT_LOGGED_IN);
    }
    //Check if not admin
    if (!await checkAdminPermissions(activeUser)) {
        throw new Error(errorName.NOT_AUTHORIZED);
    }
    //Execute query
    return neo4j.listUsers(input);
}

const listArms = async (input, context) => {
    let activeUser = context.userInfo;
    if (!verifyUserInfo(activeUser)){
        throw new Error(errorName.NOT_LOGGED_IN);
    }
    return await neo4j.listArms(input);
}

async function requestAccess(parameters, context) {
    let activeUser = context.userInfo;
    // Validate login and parameters
    isValidOrThrow([
        new LoginCondition(activeUser.email, activeUser.IDP),
        new ArmReqUserStatusCondition(activeUser.userStatus),
        new ArmRequestParamsCondition(parameters.userInfo.armIDs)
    ]);
    // Get unique list of arm ids
    const reqArmIDs = getUniqueArr(parameters.userInfo.armIDs);
    const arms = await searchValidReqArms({armIDs: reqArmIDs}, context);
    isValidOrThrow([
        new ArmExistCondition(arms, reqArmIDs)
    ]);
    // Create Arm Access Requests
    const addArmRequestAccessResponse = await addArmRequestAccess(reqArmIDs, context);
    if (!addArmRequestAccessResponse) {
        throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
    }
    // Update the user's info
    activeUser = await updateMyUser(parameters, context);
    updateUserInSession(context, activeUser);
    // Send email notifications
    if (config.emails_enabled) {
        try{
            let arms = await neo4j.getArmNamesFromArmIds(reqArmIDs);
            let messageVariables = {
                "arms": arms.join(", "),
                "user": `${activeUser.firstName} ${activeUser.lastName}`
            }
            await notifyTemplate(activeUser.email, activeUser.firstName, activeUser.lastName, messageVariables,
                notifyAdminArmAccessRequest, notifyUserArmAccessRequest);
        }
        catch (err) {
            console.error("Failed to send notification email: "+err);
        }
    }
    await logRequestArmAccess(reqArmIDs, activeUser.userID, activeUser.email, activeUser.IDP);
    // Return the user's information
    return activeUser;

}

const searchValidReqArms = async (parameters, context) => {
    const activeUser = context.userInfo;
    return await neo4j.searchValidRequestArm(
        {...parameters, invalidStatus: ArmAccess.rejectRequestAccessStatus() }, activeUser);
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

const rejectAdminArmRequest = (email, idp, role)=> {
    const generalUserCondition = new GeneralUserCondition(email, idp, role);
    generalUserCondition.throwError = ()=> { throw new Error(errorName.INVALID_ADMIN_ARM_REQUEST); };
    return generalUserCondition;
}

const addArmRequestAccess = async (armIDs, context) => {
    let activeUser = context.userInfo;
    isValidOrThrow([
        new idpCondition(activeUser.email, activeUser.IDP),
        rejectAdminArmRequest(activeUser.email, activeUser.IDP, activeUser.role)
    ]);
    const response = await neo4j.requestArmAccess(createReqArmParams(armIDs), activeUser);
    if (!response) {
        throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
    }
    return response;
}

const seedInit = async () => {
    let seedData;
    if ((await neo4j.getAdminEmails()).length < 1){
        try{
            seedData = yaml.load(fs.readFileSync(config.seed_data_file, 'utf8'), 'utf8');
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
               seedData = yaml.load(fs.readFileSync(config.seed_data_file, 'utf8'), 'utf8');
           }
           let arms = seedData.arms;
           await neo4j.createArms(arms);
           console.log("Seed arms initialized in database");
       } catch (err){
           console.error("Seed arms initialization failed: "+err);
       }
    }
}

const registerUser = async (firstName, lastName, email, IDP, isNotify) => {
    isValidOrThrow([
        new idpCondition(email, IDP)]
    );
    if (!await checkUnique(email, IDP)) {
        throw new Error(errorName.NOT_UNIQUE);
    }
    let generatedInfo = {
        organization: "",
        userID: v4(),
        status: NONE,
        role: NON_MEMBER
    };
    let registrationInfo = {
        firstName, lastName, email, IDP,
        ...generatedInfo
    };
    let response = await neo4j.registerUser(registrationInfo);
    // Send email notification after success
    if (!response){
        throw new Error(errorName.UNABLE_TO_REGISTER_USER);
    }
    if (isNotify) {
        await notifyTemplate(email, firstName, lastName, sendAdminNotification, sendRegistrationConfirmation);
    }
    await logRegisterUser(registrationInfo.userID, registrationInfo.email, registrationInfo.IDP);
    return response;
}


const approveAccess = async (parameters, context) => {
    const activeUser = context.userInfo;
    if (!verifyUserInfo(activeUser)){
        return new Error(errorName.NOT_LOGGED_IN);
    }
    if (!await checkAdminPermissions(activeUser)) {
        return new Error(errorName.NOT_AUTHORIZED);
    }
    if (!await validateInputArms(parameters.userID, parameters.armIDs, [PENDING, REJECTED, REVOKED])){
        return new Error(errorName.INVALID_REVIEW_ARMS);
    }
    const initialUserState = await neo4j.getUserByID(parameters.userID);
    parameters.reviewDate = (new Date()).toString();
    parameters.reviewerEmail = activeUser.email;
    parameters.reviewerIDP = activeUser.IDP;
    let response = await neo4j.approveAccess(parameters)
    const currentUserState = await neo4j.getUserByID(parameters.userID);
    if (config.emails_enabled && response) {
        let template_params = {
            firstName: currentUserState.firstName,
            lastName: currentUserState.lastName,
            comment: parameters.comment,
        }
        let armNames = await neo4j.getArmNamesFromArmIds(parameters.armIDs);
        let messageVariables = {
            "arms": armNames.join(", ")
        }
        await sendApprovalNotification(currentUserState.email, messageVariables, template_params);
    }
    await logReview(APPROVED, parameters.armIDs, currentUserState.email, currentUserState["IDP"] , activeUser.email, activeUser.IDP);
    await logUserUpdates(activeUser.email, activeUser.IDP, activeUser.userID, initialUserState, currentUserState);
    return response;
}

const rejectAccess = async (parameters, context) => {
    const activeUser = context.userInfo;
    if (!verifyUserInfo(activeUser)){
        return new Error(errorName.NOT_LOGGED_IN);
    }
    if (!await checkAdminPermissions(activeUser)) {
        return new Error(errorName.NOT_AUTHORIZED);
    }
    if (!await validateInputArms(parameters.userID, parameters.armIDs, [PENDING])){
        return new Error(errorName.INVALID_REVIEW_ARMS);
    }
    const initialUserState = await neo4j.getUserByID(parameters.userID);
    parameters.reviewDate = (new Date()).toString();
    parameters.reviewerEmail = activeUser.email;
    parameters.reviewerIDP = activeUser.IDP;
    let response = await neo4j.rejectAccess(parameters)
    const currentUserState = await neo4j.getUserByID(parameters.userID);
    if (config.emails_enabled && response) {
        let template_params = {
            firstName: currentUserState.firstName,
            lastName: currentUserState.lastName,
            comment: parameters.comment,
        }
        let armNames = await neo4j.getArmNamesFromArmIds(parameters.armIDs);
        let messageVariables = {
            "arms": armNames.join(", ")
        }
        await sendRejectionNotification(currentUserState.email, messageVariables, template_params);
    }
    await logReview(REJECTED, parameters.armIDs, currentUserState.email, currentUserState.IDP, activeUser.email, activeUser.IDP);
    await logUserUpdates(activeUser.email, activeUser.IDP, activeUser.userID, initialUserState, currentUserState);
    return response;
}

const revokeAccess = async (parameters, context) => {
    try{
        const activeUser = context.userInfo;
        if (!verifyUserInfo(activeUser)) {
            return new Error(errorName.NOT_LOGGED_IN);
        }
        if (!await checkAdminPermissions(activeUser)) {
            return new Error(errorName.NOT_AUTHORIZED);
        }
        if (!await validateInputArms(parameters.userID, parameters.armIDs, [APPROVED])){
            return new Error(errorName.INVALID_REVOKE_ARMS);
        }
        const initialUserState = await neo4j.getUserByID(parameters.userID);
        parameters.reviewDate = (new Date()).toString();
        parameters.reviewerEmail = activeUser.email;
        parameters.reviewerIDP = activeUser.IDP;
        let response = await neo4j.revokeAccess(parameters)
        const currentUserState = await neo4j.getUserByID(parameters.userID);
        if (config.emails_enabled && response) {
            // todo implement email notification
        }
        await logReview(REVOKED, parameters.armIDs, currentUserState.email, currentUserState.IDP, activeUser.email, activeUser.IDP);
        await logUserUpdates(activeUser.email, activeUser.IDP, activeUser.userID, initialUserState, currentUserState);
        return response;

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
    const activeUser = context.userInfo;
    if (!verifyUserInfo(activeUser)) {
        return new Error(errorName.NOT_LOGGED_IN);
    }
    if (!await checkAdminPermissions(activeUser)) {
        return new Error(errorName.NOT_AUTHORIZED);
    }
    if (parameters.role && !isElementInArrayCaseInsensitive(user_roles, parameters.role)) {
        return new Error(errorName.INVALID_ROLE);
    }
    if (parameters.userStatus !== "" && parameters.userStatus && !isElementInArrayCaseInsensitive(user_statuses, parameters.userStatus)) {
        return new Error(errorName.INVALID_STATUS);
    }
    const initialUserState = await neo4j.getUserByID(parameters.userID);
    parameters.editDate = (new Date()).toString();
    const adminUserParams = await disableAdmin(parameters.userID, parameters, context);
    let response = await neo4j.editUser({...parameters,...adminUserParams});
    const currentUserState = await neo4j.getUserByID(parameters.userID);
    if (currentUserState.userID === activeUser.userID) {
        updateUserInSession(context, currentUserState);
    }
    if (!response) {
        return new Error(errorName.USER_NOT_FOUND);
    }
    let template_params = {
        firstName: response.firstName,
        lastName: response.lastName,
        comment: parameters.comment,
    }
    await sendEditNotification(response.email, template_params);
    await logUserUpdates(activeUser.email, activeUser.IDP, activeUser.userID, initialUserState, currentUserState);
    return response;
}

const updateMyUser = async (parameters, context) => {
    let activeUser = context.userInfo;
    isValidOrThrow([
        new LoginCondition(activeUser.email, activeUser.IDP)
    ]);
    const initialUserState = activeUser;
    const currentUserState = await neo4j.updateMyUser(parameters.userInfo, context.userInfo);
    updateUserInSession(context, currentUserState);
    await logUserUpdates(currentUserState.email, currentUserState.IDP, currentUserState.userID, initialUserState, currentUserState);
    return currentUserState;
}

function verifyUserInfo(userInfo) {
    return userInfo && userInfo.email && userInfo.IDP;
}

const listRequest = async (params, context) => {
    let activeUser = context.userInfo;
    //Check logged in
    if (!verifyUserInfo(activeUser)) {
        return new Error(errorName.NOT_LOGGED_IN);
    }
    //Check if not admin
    else if (!await checkAdminPermissions(activeUser)) {
        return new Error(errorName.NOT_AUTHORIZED);
    }
    //Execute query
    else {
        return neo4j.listRequest(params);
    }
}

async function logUserUpdates(actingUserEmail, actingUserIDP, actingUserID, prevUserInfo, newUserInfo){
    const requiredFields = ["firstName", "lastName", "organization", "role", "userStatus"];
    for (const field of requiredFields) {
       if (prevUserInfo[field] === undefined) {
           missingRequiredFieldWarning(prevUserInfo.userID, field);
       }
       else if (!newUserInfo[field] === undefined){
           missingRequiredFieldWarning(newUserInfo.userID, field);
       }
       else if (prevUserInfo[field] !== newUserInfo[field]){
           await logEditUser(field, prevUserInfo[field], newUserInfo[field], actingUserID, actingUserEmail,
               actingUserIDP, newUserInfo.userID, newUserInfo.email, newUserInfo.IDP);
       }
    }
    const optionalFields = ["organization"];
    for (const field of optionalFields) {
        if (prevUserInfo[field] !== newUserInfo[field]){
            await logEditUser(field, prevUserInfo[field], newUserInfo[field], actingUserID, actingUserEmail,
                actingUserIDP, newUserInfo.userID, newUserInfo.email, newUserInfo.IDP);
        }
    }
}

function missingRequiredFieldWarning(userID, field){
    console.error(`The user with ID:'${userID}' is missing the required field '${field}'.`)
}

function updateUserInSession(context, user){
    context.userInfo = user;
}

const disableInactiveUsers = async () => {
    const disableUsers = await neo4j.getInactiveUsers();
    if (disableUsers && disableUsers.length > 0) {
        // Disable inactive users
        const disabledUsers = await neo4j.disableUsers({ids: disableUsers.map( (u) => u.userID)});
        if (!disabledUsers || disabledUsers.length === 0) {
            console.error("Disabling users failed");
            return;
        }
        // Email Notification
        await(disableNotification(disabledUsers));
        await logDisableUser(disableUsers);
        // Disable admin status
        const disableAdminIDs = disableUsers.filter((u)=> isCaseInsensitiveEqual(u.role, ADMIN)).map((u) => (u.userID));
        if (disableAdminIDs.length > 0) {
            const disabledAdmins = await neo4j.disableAdminRole({ids: disableAdminIDs}, MEMBER);
            if (!disabledAdmins || disabledAdmins.length === 0) console.error("Disabling the admin role failed");
        }
        // store disabled admin event
        for (const u of disableUsers) {
            if (isElementInArray(disableAdminIDs, u.userID)) {
                await logEditUser("role", ADMIN, MEMBER, NOT_APPLICABLE, NOT_APPLICABLE, NOT_APPLICABLE,u.userID, u.userEmail,u.IDP);
            }
        }
    }
    return disableUsers;
}

const downloadEvents = async (req, res) => {
    const activeUser = req.session.userInfo;
    if (!verifyUserInfo(activeUser)) {
        throw new Error(errorName.NOT_LOGGED_IN);
    }
    if (!await checkAdminPermissions(activeUser)) {
        throw new Error(errorName.NOT_AUTHORIZED);
    }
    // Create tmp directory or clear tmp directory if it already exists
    const tmp_dir = "tmp";
    if (fs.existsSync(tmp_dir)){
        for (const file of await fsp.readdir(tmp_dir)) {
            await fsp.unlink(path.join(tmp_dir, file));
        }
    }
    else{
        fs.mkdirSync(tmp_dir);
    }
    // Write events to file and then return file path
    const fileName = path.join(tmp_dir, moment().format('YYYY-MM-DD') + '.events.json');
    const allEvents = await neo4j.getRecentEventsNeo4j(config.event_download_limit);
    const eventsData = allEvents.map((x) => {
        return x.properties;
    });
    let fileData = {
        "meta-data": {
            "user": activeUser.email,
            "time": moment().format('YYYY MMM DD HH:mm:ss'),
            "num_events_downloaded": eventsData.length,
            "event_download_limit": config.event_download_limit
        },
        "events" : eventsData
    };
    await fsp.writeFile(fileName, JSON.stringify(fileData));
    return fileName;
}

module.exports = {
    getMyUser,
    getUser,
    listUsers,
    registerUser: registerUser,
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
    disableInactiveUsers,
    downloadEvents
};
