//external libraries
const {v4} = require('uuid')
const moment = require("moment");
const path = require("path");
const fs = require('fs');
const fsp = fs.promises;
//constants
const {errorName} = require("./graphql-api-constants");
const {NONE, NON_MEMBER, ADMIN, MEMBER, ACTIVE, INACTIVE, NOT_APPLICABLE} = require("../bento-event-logging/const/user-constant");
const {user_statuses, user_roles} = require("../bento-event-logging/const/format-constants")
const {PENDING, REJECTED, REVOKED, APPROVED} = require("../bento-event-logging/const/access-constant");
//configuration
const config = require('../config');
//conditions
const LoginCondition = require("../model/valid-conditions/login-condition");
const {ArmRequestParamsCondition, ArmExistCondition, ArmReqUserStatusCondition} = require("../model/valid-conditions/arm-conditions");
const idpCondition = require("../model/valid-conditions/idp-condition");
const GeneralUserCondition = require("../model/valid-conditions/general-user-condition");
//utility
const {getUniqueArr, isCaseInsensitiveEqual, isElementInArrayCaseInsensitive, isElementInArray} = require("../util/string-util");
const {getApprovedArmIDs} = require("../services/arm-access");
const ArmAccess = require("../model/arm-access");
const {createToken, getAccessToken, verifyToken, decodeToken} = require("../services/tokenizer");
//model
const User = require("../bento-event-logging/model/User");
const Token = require("../bento-event-logging/model/Token");
//services
const {NotificationsService} = require("./notifications");
const {EventLoggingService} = require("./event-logging");
const {NotifyUserService} = require("../services/notify-user");
const {NotifyService} = require("../services/notify");
const TokenCondition = require("../model/valid-conditions/token-condition");
const {addSeconds, getTimeNow, dateToEpochTimeStamp} = require("../util/time-util");

class DataInterface {
    
    constructor(dataService) {
        this.dataService = dataService;
        this.notificationsService = new NotificationsService(dataService);
        this.eventLoggingService = new EventLoggingService(dataService);
        this.notifyUserService = new NotifyUserService(dataService);
        this.notifyService = new NotifyService(dataService);
    }

    async checkUnique(email, IDP) {
        return await this.dataService.checkUnique(IDP + ":" + email);
    }

    async validateInputArms(userID, accessList, accessStatuses) {
        let existingAccess = await this.dataService.getAccesses(userID, accessStatuses);
        return accessList.every((a) => existingAccess.includes(a))
    }

    async checkAdminPermissions(userInfo) {
        let result = await this.dataService.getMyUser(userInfo);
        try {
            return isCaseInsensitiveEqual(result.role, ADMIN) && isCaseInsensitiveEqual(result.userStatus, ACTIVE);
        } catch (err) {
            return false;
        }
    }

    isValidOrThrow(conditions){
        conditions.forEach((condition) => {
            if (!condition.isValid()) condition.throwError();
        });
    }

    getUserAccessInfo (headers, sessionUserInfo) {
        const accessToken = getAccessToken(headers);
        let loginInfo = verifyToken(accessToken, config.token_secret) ? decodeToken(accessToken, config.token_secret) : sessionUserInfo;
        return [accessToken, loginInfo];
    }

    async getMyUser(_, context){
        const [accessToken, loginInfo] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(loginInfo)) : new LoginCondition(loginInfo.email, loginInfo.IDP)
        ]);
        let activeUser = await this.dataService.getMyUser(loginInfo);
        // store user if not exists in db
        if (!activeUser) {
            activeUser = await this.registerUser(loginInfo.firstName, loginInfo.lastName, loginInfo.email, loginInfo.IDP, false);
        }
        this.updateUserInSession(context, activeUser);
        return activeUser;
    }

    async getUser(parameters, context){
        const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
        ]);
        //Check if not admin
        if (!await this.checkAdminPermissions(activeUser)) {
            throw new Error(errorName.NOT_AUTHORIZED);
        }
        return await this.dataService.getUserByID(parameters.userID);
    }

    async listUsers(input, context){
        const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
        ]);
        //Check if not admin
        if (!await this.checkAdminPermissions(activeUser)) {
            throw new Error(errorName.NOT_AUTHORIZED);
        }
        //Execute query
        return this.dataService.listUsers(input);
    }

    async listArms(input, context){
        const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
        ]);
        return await this.dataService.listArms(input);
    }

    async requestAccess(parameters, context){
        let [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        // Validate login and parameters
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret,await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
            new ArmReqUserStatusCondition(activeUser.userStatus),
            new ArmRequestParamsCondition(parameters.userInfo.armIDs)
        ]);
        // Get unique list of arm ids
        const reqArmIDs = getUniqueArr(parameters.userInfo.armIDs);
        const arms = await this.searchValidReqArms({armIDs: reqArmIDs}, context);
        this.isValidOrThrow([
            new ArmExistCondition(arms, reqArmIDs)
        ]);
        // Create Arm Access Requests
        const addArmRequestAccessResponse = await this.addArmRequestAccess(reqArmIDs, context);
        if (!addArmRequestAccessResponse) {
            throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
        }
        // Update the user's info
        activeUser = await this.updateMyUser(parameters, context);
        this.updateUserInSession(context, activeUser);
        // Send email notifications
        if (config.emails_enabled) {
            try {
                let arms = await this.dataService.getArmNamesFromArmIds(reqArmIDs);
                let messageVariables = {
                    "arms": arms.join(", "),
                    "user": `${activeUser.firstName} ${activeUser.lastName}`
                }
                await this.notifyService.notifyTemplate(activeUser.email, activeUser.firstName, activeUser.lastName, messageVariables,
                    this.notificationsService.notifyAdminArmAccessRequest, this.notificationsService.notifyUserArmAccessRequest);
            } catch (err) {
                console.error("Failed to send notification email: " + err);
            }
        }
        await this.eventLoggingService.logRequestArmAccess(reqArmIDs, activeUser.userID, activeUser.email, activeUser.IDP);
        // Return the user's information
        return activeUser;
    }

    async searchValidReqArms(parameters, context){
        const activeUser = context.userInfo;
        return await this.dataService.searchValidRequestArm(
            {...parameters, invalidStatus: ArmAccess.rejectRequestAccessStatus()}, activeUser);
    }

    createReqArmParams(armIDs){
        const listParameters = [];
        const arms = Array.isArray(armIDs) ? armIDs : [armIDs];
        const requestID = v4();
        const accessStatus = PENDING;
        arms.forEach((armID) => {
            listParameters.push({armID: armID, accessStatus: accessStatus, requestID: requestID});
        });
        return listParameters;
    }

    rejectAdminArmRequest(email, idp, role){
        const generalUserCondition = new GeneralUserCondition(email, idp, role);
        generalUserCondition.throwError = () => {
            throw new Error(errorName.INVALID_ADMIN_ARM_REQUEST);
        };
        return generalUserCondition;
    }

    async addArmRequestAccess(armIDs, context){
        let activeUser = context.userInfo;
         this.isValidOrThrow([
            new idpCondition(activeUser.email, activeUser.IDP),
             this.rejectAdminArmRequest(activeUser.email, activeUser.IDP, activeUser.role)
        ]);
        const response = await this.dataService.requestArmAccess(this.createReqArmParams(armIDs), activeUser);
        if (!response) {
            throw new Error(errorName.UNABLE_TO_REQUEST_ARM_ACCESS);
        }
        return response;
    }

    async registerUser(firstName, lastName, email, IDP, isNotify){
        this.isValidOrThrow([
            new idpCondition(email, IDP)]
        );
        if (!await this.checkUnique(email, IDP)) {
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
        let response = await this.dataService.registerUser(registrationInfo);
        // Send email notification after success
        if (!response) {
            throw new Error(errorName.UNABLE_TO_REGISTER_USER);
        }
        if (isNotify) {
            await this.notifyService.notifyTemplate(email, firstName, lastName, this.notificationsService.sendAdminNotification,
                this.notificationsService.sendRegistrationConfirmation);
        }
        await this.eventLoggingService.logRegisterUser(registrationInfo.userID, registrationInfo.email, registrationInfo.IDP);
        return response;
    }

    async approveAccess(parameters, context){
        const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
        ]);
        if (!await this.checkAdminPermissions(activeUser)) {
            return new Error(errorName.NOT_AUTHORIZED);
        }
        if (!await this.validateInputArms(parameters.userID, parameters.armIDs, [PENDING, REJECTED, REVOKED])) {
            return new Error(errorName.INVALID_REVIEW_ARMS);
        }
        const initialUserState = await this.dataService.getUserByID(parameters.userID);
        parameters.reviewDate = (new Date()).toString();
        parameters.reviewerEmail = activeUser.email;
        parameters.reviewerIDP = activeUser.IDP;
        let response = await this.dataService.approveAccess(parameters)
        const currentUserState = await this.dataService.getUserByID(parameters.userID);
        if (config.emails_enabled && response) {
            let template_params = {
                firstName: currentUserState.firstName,
                lastName: currentUserState.lastName,
                comment: parameters.comment,
            }
            let armNames = await this.dataService.getArmNamesFromArmIds(parameters.armIDs);
            let messageVariables = {
                "arms": armNames.join(", ")
            }
            await this.notificationsService.sendApprovalNotification(currentUserState.email, messageVariables, template_params);
        }
        await this.eventLoggingService.logReview(APPROVED, parameters.armIDs, currentUserState.email, currentUserState["IDP"], activeUser.email, activeUser.IDP);
        await this.logUserUpdates(activeUser.email, activeUser.IDP, activeUser.userID, initialUserState, currentUserState);
        return response;
    }

    async rejectAccess(parameters, context){
        const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
        ]);
        if (!await this.checkAdminPermissions(activeUser)) {
            return new Error(errorName.NOT_AUTHORIZED);
        }
        if (!await this.validateInputArms(parameters.userID, parameters.armIDs, [PENDING])) {
            return new Error(errorName.INVALID_REVIEW_ARMS);
        }
        const initialUserState = await this.dataService.getUserByID(parameters.userID);
        parameters.reviewDate = (new Date()).toString();
        parameters.reviewerEmail = activeUser.email;
        parameters.reviewerIDP = activeUser.IDP;
        let response = await this.dataService.rejectAccess(parameters)
        const currentUserState = await this.dataService.getUserByID(parameters.userID);
        if (config.emails_enabled && response) {
            let template_params = {
                firstName: currentUserState.firstName,
                lastName: currentUserState.lastName,
                comment: parameters.comment,
            }
            let armNames = await this.dataService.getArmNamesFromArmIds(parameters.armIDs);
            let messageVariables = {
                "arms": armNames.join(", ")
            }
            await this.notificationsService.sendRejectionNotification(currentUserState.email, messageVariables, template_params);
        }
        await this.eventLoggingService.logReview(REJECTED, parameters.armIDs, currentUserState.email, currentUserState.IDP, activeUser.email, activeUser.IDP);
        await this.logUserUpdates(activeUser.email, activeUser.IDP, activeUser.userID, initialUserState, currentUserState);
        return response;
    }

    async revokeAccess(parameters, context){
        try {
            const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
            this.isValidOrThrow([
                (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
            ]);
            if (!await this.checkAdminPermissions(activeUser)) {
                return new Error(errorName.NOT_AUTHORIZED);
            }
            if (!await this.validateInputArms(parameters.userID, parameters.armIDs, [APPROVED])) {
                return new Error(errorName.INVALID_REVOKE_ARMS);
            }
            const initialUserState = await this.dataService.getUserByID(parameters.userID);
            parameters.reviewDate = (new Date()).toString();
            parameters.reviewerEmail = activeUser.email;
            parameters.reviewerIDP = activeUser.IDP;
            let response = await this.dataService.revokeAccess(parameters)
            const currentUserState = await this.dataService.getUserByID(parameters.userID);
            if (config.emails_enabled && response) {
                // todo implement email notification
            }
            await this.eventLoggingService.logReview(REVOKED, parameters.armIDs, currentUserState.email, currentUserState.IDP, activeUser.email, activeUser.IDP);
            await this.logUserUpdates(activeUser.email, activeUser.IDP, activeUser.userID, initialUserState, currentUserState);
            return response;

        } catch (err) {
            return err;
        }
    }

     async disableAdmin(userID, params, context){
        const aUser = await this.getUser({userID: userID}, context);
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

    async editUser(parameters, context){
        const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
        ]);
        if (!await this.checkAdminPermissions(activeUser)) {
            return new Error(errorName.NOT_AUTHORIZED);
        }
        if (parameters.role && !isElementInArrayCaseInsensitive(user_roles, parameters.role)) {
            return new Error(errorName.INVALID_ROLE);
        }
        if (parameters.userStatus !== "" && parameters.userStatus && !isElementInArrayCaseInsensitive(user_statuses, parameters.userStatus)) {
            return new Error(errorName.INVALID_STATUS);
        }
        const initialUserState = await this.dataService.getUserByID(parameters.userID);
        parameters.editDate = (new Date()).toString();
        const adminUserParams = await this.disableAdmin(parameters.userID, parameters, context);
        let response = await this.dataService.editUser({...parameters, ...adminUserParams});
        const currentUserState = await this.dataService.getUserByID(parameters.userID);
        if (currentUserState.userID === activeUser.userID) {
            this.updateUserInSession(context, currentUserState);
        }
        if (!response) {
            return new Error(errorName.USER_NOT_FOUND);
        }
        let template_params = {
            firstName: response.firstName,
            lastName: response.lastName,
            comment: parameters.comment,
        }
        await this.notificationsService.sendEditNotification(response.email, template_params);
        await this.logUserUpdates(activeUser.email, activeUser.IDP, activeUser.userID, initialUserState, currentUserState);
        return response;
    }

    async updateMyUser(parameters, context){
        const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP)
        ]);
        const initialUserState = activeUser;
        const currentUserState = await this.dataService.updateMyUser(parameters.userInfo, context.userInfo);
         this.updateUserInSession(context, currentUserState);
        await this.logUserUpdates(currentUserState.email, currentUserState.IDP, currentUserState.userID, initialUserState, currentUserState);
        return currentUserState;
    }

    async listRequest(params, context){
        //Check logged in
        const [accessToken, activeUser] = this.getUserAccessInfo(context.req.headers, context.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret, await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP),
        ]);
        //Check if not admin
        if (!await this.checkAdminPermissions(activeUser)) {
            return new Error(errorName.NOT_AUTHORIZED);
        }
        //Execute query
        else {
            return this.dataService.listRequest(params);
        }
    }

    async logUserUpdates(actingUserEmail, actingUserIDP, actingUserID, prevUserInfo, newUserInfo) {
        const requiredFields = ["firstName", "lastName", "organization", "role", "userStatus"];
        for (const field of requiredFields) {
            if (prevUserInfo[field] === undefined) {
                this.missingRequiredFieldWarning(prevUserInfo.userID, field);
            } else if (!newUserInfo[field] === undefined) {
                this.missingRequiredFieldWarning(newUserInfo.userID, field);
            } else if (prevUserInfo[field] !== newUserInfo[field]) {
                await this.eventLoggingService.logEditUser(field, prevUserInfo[field], newUserInfo[field], actingUserID, actingUserEmail,
                    actingUserIDP, newUserInfo.userID, newUserInfo.email, newUserInfo.IDP);
            }
        }
        const optionalFields = ["organization"];
        for (const field of optionalFields) {
            if (prevUserInfo[field] !== newUserInfo[field]) {
                await this.eventLoggingService.logEditUser(field, prevUserInfo[field], newUserInfo[field], actingUserID, actingUserEmail,
                    actingUserIDP, newUserInfo.userID, newUserInfo.email, newUserInfo.IDP);
            }
        }
    }

    missingRequiredFieldWarning(userID, field) {
        console.error(`The user with ID:'${userID}' is missing the required field '${field}'.`)
    }

    updateUserInSession(context, user) {
        context.userInfo = user;
    }

    async disableInactiveUsers(){
        const disableUsers = await this.dataService.getInactiveUsers();
        if (disableUsers && disableUsers.length > 0) {
            // Disable inactive users
            const disabledUsers = await this.dataService.disableUsers({ids: disableUsers.map((u) => u.userID)});
            if (!disabledUsers || disabledUsers.length === 0) {
                console.error("Disabling users failed");
                return;
            }
            // Email Notification
            await (this.notifyUserService.disableNotification(disabledUsers));
            await this.eventLoggingService.logDisableUser(disableUsers);
            // Disable admin status
            const disableAdminIDs = disableUsers.filter((u) => isCaseInsensitiveEqual(u.role, ADMIN)).map((u) => (u.userID));
            if (disableAdminIDs.length > 0) {
                const disabledAdmins = await this.dataService.disableAdminRole({ids: disableAdminIDs}, MEMBER);
                if (!disabledAdmins || disabledAdmins.length === 0) console.error("Disabling the admin role failed");
            }
            // store disabled admin event
            for (const u of disableUsers) {
                if (isElementInArray(disableAdminIDs, u.userID)) {
                    await this.eventLoggingService.logEditUser("role", ADMIN, MEMBER, NOT_APPLICABLE, NOT_APPLICABLE, NOT_APPLICABLE, u.userID, u.userEmail, u.IDP);
                }
            }
        }
        return disableUsers;
    }

    async deleteExpiredTokenUUIDs() {
        return await this.dataService.deleteExpiredTokenUUIDs();
    }

    async downloadEvents(req, res){
        let [accessToken, activeUser] = this.getUserAccessInfo(req.headers, req.session.userInfo);
        this.isValidOrThrow([
            (accessToken) ? new TokenCondition(accessToken, config.token_secret,await this.dataService.getUserTokenUUIDs(activeUser)) : new LoginCondition(activeUser.email, activeUser.IDP)
        ]);
        if (!await this.checkAdminPermissions(activeUser)) {
            throw new Error(errorName.NOT_AUTHORIZED);
        }
        // Create tmp directory or clear tmp directory if it already exists
        const tmp_dir = "tmp";
        if (fs.existsSync(tmp_dir)) {
            for (const file of await fsp.readdir(tmp_dir)) {
                await fsp.unlink(path.join(tmp_dir, file));
            }
        } else {
            fs.mkdirSync(tmp_dir);
        }
        // Write events to file and then return file path
        const fileName = path.join(tmp_dir, moment().format('YYYY-MM-DD') + '.events.json');
        const allEvents = await this.dataService.getRecentEventsNeo4j(config.event_download_limit);
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
            "events": eventsData
        };
        await fsp.writeFile(fileName, JSON.stringify(fileData));
        return fileName;
    }

    epochLogTime() {
        const logTime = addSeconds(getTimeNow(), config.token_timeout).toString();
        return dateToEpochTimeStamp(logTime);
    }

    async grantToken (_, context){
        const userInfo = context.userInfo;
        this.isValidOrThrow([
            new LoginCondition(userInfo.email, userInfo.IDP)
        ]);
        const uuid = v4();
        const accessToken = createToken({...userInfo, uuid}, config.token_secret, config.token_timeout);
        const aUser = await this.dataService.linkTokenToUser({uuid, expiration: this.epochLogTime()}, userInfo);
        const token = new Token(uuid, this.epochLogTime());
        if (aUser) await this.eventLoggingService.logCreateToken(new User(aUser.userID, aUser.email, aUser.IDP), token);
        return {
            token: accessToken,
            message: 'This token can only be viewed once and will be lost if it is not saved by the user'
        }
    }

}

module.exports = {
    DataInterface
};
