const {RequestEvent} = require("../bento-event-logging/model/request-event");
const {RegistrationEvent} = require("../bento-event-logging/model/registration-event");
const {ReviewEvent} = require("../bento-event-logging/model/review-event");
const {UpdateEvent} = require("../bento-event-logging/model/update-event");
const {getArmNamesFromArmIds, getArmsFromArmIds, logEventNeo4j, getUserByEmailIDP} = require("./neo4j-service");
const {PENDING, APPROVED, REVOKED} = require("../bento-event-logging/const/access-constant");


const logRequestArmAccess = async (armIDs, userEmail, userIDP) => {
    let userID = await getUserByEmailIDP(userEmail, userIDP);
    for (const armID of armIDs) {
        const armName = (await getArmNamesFromArmIds([armID]))[0];
        const requestEvent = new RequestEvent(armID, armName, userID, userEmail, userIDP);
        await logEventNeo4j(requestEvent);
    }
};

const logRegisterUser = async (userID, userEmail, userIDP) => {
    const registrationEvent = new RegistrationEvent(userID, userEmail, userIDP)
    await logEventNeo4j(registrationEvent);
};

const logReview = async (newStatus, armIDs, requesterEmail, requesterIDP, reviewerEmail, reviewerIDP) => {
    let reviewerID = await getUserByEmailIDP(reviewerEmail, reviewerIDP);
    let requesterID = await getUserByEmailIDP(requesterEmail, requesterIDP);
    let oldStatus = PENDING;
    if (newStatus === REVOKED){
        oldStatus = APPROVED;
    }
    const arms = await getArmsFromArmIds(armIDs);
    for (const arm of arms) {
        const reviewEvent = new ReviewEvent(arm.id, arm.name, requesterID, requesterEmail, requesterIDP, newStatus,
            oldStatus, reviewerID, reviewerEmail, reviewerIDP);
        await logEventNeo4j(reviewEvent);
    }
}

const logEditUser = async (updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP,
                           updatedUserID, updatedUserEmail, updatedUserIDP) => {
    const updateEvent = new UpdateEvent(updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP,
        updatedUserID, updatedUserEmail, updatedUserIDP);
    await logEventNeo4j(updateEvent);
};

module.exports = {
    logRequestArmAccess,
    logRegisterUser,
    logReview,
    logEditUser
}