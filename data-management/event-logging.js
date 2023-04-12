const {RequestEvent} = require("../bento-event-logging/model/request-event");
const {RegistrationEvent} = require("../bento-event-logging/model/registration-event");
const {ReviewEvent} = require("../bento-event-logging/model/review-event");
const {UpdateEvent} = require("../bento-event-logging/model/update-event");
const {PENDING, APPROVED, REVOKED} = require("../bento-event-logging/const/access-constant");
const {NOT_APPLICABLE, DISABLED} = require("../bento-event-logging/const/user-constant");
const {TokenCreateEvent} = require("../bento-event-logging/model/token-create-event");
const {TokenInvalidatedEvent} = require("../bento-event-logging/model/token-invalidated-event");

class EventLoggingService {

    constructor(dataService) {
        this.dataService = dataService
    }

    async logRequestArmAccess(armIDs, userID, userEmail, userIDP){
        const arms = await this.dataService.getArmsFromArmIds(armIDs);
        for (const arm of arms) {
            const requestEvent = new RequestEvent(arm.properties.id, arm.properties.name, userID, userEmail, userIDP);
            await this.dataService.logEventNeo4j(requestEvent);
        }
    };

    async logRegisterUser(userID, userEmail, userIDP){
        const registrationEvent = new RegistrationEvent(userID, userEmail, userIDP)
        await this.dataService.logEventNeo4j(registrationEvent);
    };

    async logReview(newStatus, armIDs, requesterEmail, requesterIDP, reviewerEmail, reviewerIDP){
        let reviewer = await this.dataService.getUserByEmailIDP(reviewerEmail, reviewerIDP);
        let requester = await this.dataService.getUserByEmailIDP(requesterEmail, requesterIDP);
        let oldStatus = PENDING;
        if (newStatus === REVOKED) {
            oldStatus = APPROVED;
        }
        const arms = await this.dataService.getArmsFromArmIds(armIDs);
        for (const arm of arms) {
            const reviewEvent = new ReviewEvent(arm.properties.id, arm.properties.name, requester.userID, requesterEmail,
                requesterIDP, newStatus, oldStatus, reviewer.userID, reviewerEmail, reviewerIDP);
            await this.dataService.logEventNeo4j(reviewEvent);
        }
    }

    async logEditUser(updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP,
                         updatedUserID, updatedUserEmail, updatedUserIDP){
        const updateEvent = new UpdateEvent(updatedField, oldValue, newValue, actingUserID, actingUserEmail, actingUserIDP,
            updatedUserID, updatedUserEmail, updatedUserIDP);
        await this.dataService.logEventNeo4j(updateEvent);
    };

     async logDisableUser(users){
        for (const u of users) {
            await this.dataService.logEventNeo4j(new UpdateEvent('userStatus', u.userStatus, DISABLED, NOT_APPLICABLE,
                NOT_APPLICABLE, NOT_APPLICABLE, u.userID, u.userEmail, u.IDP));
        }
    };

    async logCreateToken(user, token) {
        const createTokenEnt = new TokenCreateEvent(user, token);
        await this.dataService.logEventNeo4j(createTokenEnt);
    }

    async logInvalidatedToken(user, tokenUUIDs) {
        const createTokenEnt = new TokenInvalidatedEvent(user, tokenUUIDs);
        await this.dataService.logEventNeo4j(createTokenEnt);
    }
}

module.exports = {EventLoggingService}