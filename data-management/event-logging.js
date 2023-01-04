const {RequestEvent} = require("../bento-event-logging/model/request-event");
const {RegistrationEvent} = require("../bento-event-logging/model/registration-event");
const {ReviewEvent} = require("../bento-event-logging/model/review-event");
const {UpdateEvent} = require("../bento-event-logging/model/update-event");
const {logEvent, getUserID} = require("../bento-event-logging/neo4j/neo4j-operations");
const {neo4jConnection, getArmNamesFromArmIds} = require("./neo4j-service");
const {PENDING, APPROVED, REJECTED, REVOKED} = require("../bento-event-logging/const/access-constant");


const logRequestArmAccess = async (armIDs, userEmail, userIDP) => {
    let userID = await getUserID(neo4jConnection, userEmail, userIDP);
    for (const armID of armIDs) {
        const armName = (await getArmNamesFromArmIds([armID]))[0];
        const requestEvent = new RequestEvent(armID, armName, userID, userEmail, userIDP);
        await logEvent(neo4jConnection, requestEvent);
    }
};

const logRegisterUser = async (userID, userEmail, userIDP) => {
    const registrationEvent = new RegistrationEvent(userID, userEmail, userIDP)
    await logEvent(neo4jConnection, registrationEvent);
};

const logReview = async (newStatus, armIDs, requesterEmail, requesterIDP, reviewerEmail, reviewerIDP) => {
    let reviewerID = await getUserID(neo4jConnection, reviewerEmail, reviewerIDP);
    let requesterID = await getUserID(neo4jConnection, requesterEmail, requesterIDP);
    let oldStatus = PENDING;
    if (newStatus === REVOKED){
        oldStatus = APPROVED;
    }
    for (const armID of armIDs) {
        const armName = (await getArmNamesFromArmIds([armID]))[0];
        const reviewEvent = new ReviewEvent(armID, armName, requesterID, requesterEmail, requesterIDP, newStatus,
            oldStatus, reviewerID, reviewerEmail, reviewerIDP);
        await logEvent(neo4jConnection, reviewEvent);
    }
}

const logEditUser = async (updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP,
                           updatedUserID, updatedUserEmail, updatedUserIDP) => {
    const updateEvent = new UpdateEvent(updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP,
        updatedUserID, updatedUserEmail, updatedUserIDP);
    await logEvent(neo4jConnection, updateEvent);
};

module.exports = {
    logRequestArmAccess,
    logRegisterUser,
    logReview,
    logEditUser
}