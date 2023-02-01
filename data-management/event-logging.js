const {RequestEvent} = require("../bento-event-logging/model/request-event");
const {RegistrationEvent} = require("../bento-event-logging/model/registration-event");
const {ReviewEvent} = require("../bento-event-logging/model/review-event");
const {UpdateEvent} = require("../bento-event-logging/model/update-event");
const {getArmsFromArmIds, logEventNeo4j, getUserByEmailIDP} = require("./neo4j-service");
const {PENDING, APPROVED, REVOKED} = require("../bento-event-logging/const/access-constant");
const {DisableUserEvent} = require("../bento-event-logging/model/disable-user-event");


const logRequestArmAccess = async (armIDs, userID, userEmail, userIDP) => {
    const arms = await getArmsFromArmIds(armIDs);
    for (const arm of arms) {
        const requestEvent = new RequestEvent(arm.properties.id, arm.properties.name, userID, userEmail, userIDP);
        await logEventNeo4j(requestEvent);
    }
};

const logRegisterUser = async (userID, userEmail, userIDP) => {
    const registrationEvent = new RegistrationEvent(userID, userEmail, userIDP)
    await logEventNeo4j(registrationEvent);
};

const logReview = async (newStatus, armIDs, requesterEmail, requesterIDP, reviewerEmail, reviewerIDP) => {
    let reviewer = await getUserByEmailIDP(reviewerEmail, reviewerIDP);
    let requester = await getUserByEmailIDP(requesterEmail, requesterIDP);
    let oldStatus = PENDING;
    if (newStatus === REVOKED){
        oldStatus = APPROVED;
    }
    const arms = await getArmsFromArmIds(armIDs);
    for (const arm of arms) {
        const reviewEvent = new ReviewEvent(arm.properties.id, arm.properties.name, requester.userID, requesterEmail,
            requesterIDP, newStatus, oldStatus, reviewer.userID, reviewerEmail, reviewerIDP);
        await logEventNeo4j(reviewEvent);
    }
}

const logEditUser = async (updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP,
                           updatedUserID, updatedUserEmail, updatedUserIDP) => {
    const updateEvent = UpdateEvent.updateUserEvent(updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP,
        updatedUserID, updatedUserEmail, updatedUserIDP);
    await logEventNeo4j(updateEvent);
};

const logEditUserByApp = async (updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP) => {
    const updateEvent = UpdateEvent.updateUserEventByApp(updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP);
    await logEventNeo4j(updateEvent);
};

const logDisableUser = async (users) => {
    for (const u of users) {
        await logEventNeo4j(new DisableUserEvent(u.userID, u.userEmail, u.IDP));
    }
};

module.exports = {
    logRequestArmAccess,
    logRegisterUser,
    logReview,
    logEditUser,
    logDisableUser,
    logEditUserByApp
}