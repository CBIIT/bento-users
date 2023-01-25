const neo4j = require('neo4j-driver');
const config = require('../config');
const {getTimeNow} = require("../util/time-util");
const {isUndefined} = require("../util/string-util");
const {ADMIN, ACTIVE, NON_MEMBER, MEMBER, INACTIVE, DISABLED} = require("../bento-event-logging/const/user-constant");
const driver = neo4j.driver(
    config.NEO4J_URI,
    neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
    {disableLosslessIntegers: true}
);
const {APPROVED, REJECTED, REVOKED} = require("../bento-event-logging/const/access-constant");
const {LOGIN} = require("../bento-event-logging/const/event-types");
const {executeQuery, logEvent, getRecentEvents} = require("../bento-event-logging/neo4j/neo4j-operations");

//Queries
async function createArms(arms){
    for (let arm of arms) {
        const cypher =
        `
            CREATE (arm:Arm)
            SET arm.id = $id
            SET arm.name = $name
            SET arm.acronym = $acronym
            RETURN arm
        `
        let result = await runNeo4jQuery(arm, cypher, 'arm');
        if (!result[0]){
            throw new Error("Failed to initialize arm with the following data: "+arm);
        }
    }
}

async function getAccesses(userID, accessStatuses){
    let parameters = {userID, accessStatuses};
    const cypher =
    `
        MATCH (u:User)
        WHERE u.userID = $userID
        MATCH (arm:Arm)<-[:of_arm]-(a:Access)-[:of_user]->(u)
        WHERE a.accessStatus IN $accessStatuses
        RETURN COLLECT(DISTINCT arm.id) AS result
    `
    const result = await runNeo4jQuery(parameters, cypher, 'result');
    return result[0];
}

// TODO delete
async function getAdminEmails() {
    const cypher =
        `
        MATCH (n:User)
        WHERE n.role = '${ADMIN}' AND n.userStatus = '${ACTIVE}'
        RETURN COLLECT(DISTINCT n.email) AS result
    `
    const result = await runNeo4jQuery({}, cypher, 'result');
    return result[0];
}

async function getAdmins() {
    const cypher =
        `
        MATCH (u:User)
        WHERE u.role = '${ADMIN}' AND u.userStatus = '${ACTIVE}'
        RETURN COLLECT (DISTINCT {
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email
        }) AS user
    `
    const result = await runNeo4jQuery({}, cypher, 'user');
    return result[0];
}

async function checkUnique(key) {
    let parameters = {key: key};
    const cypher =
        `
        MATCH (n:User)
        WITH COLLECT(DISTINCT n.IDP+":"+n.email) AS keys
        RETURN NOT $key in keys as result
    `
    const result = await runNeo4jQuery(parameters, cypher, 'result');
    return result[0];
}


async function getMyUser(parameters) {
    const cypher =
        `
        MATCH (user:User)
        WHERE user.email = $email AND user.IDP = $IDP
        OPTIONAL MATCH (user)<-[:of_user]-(request:Access)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(request)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(request)
        // a disabled user does not have access to acl
        WITH user, CASE WHEN user.userStatus = '${DISABLED}' THEN [] ELSE COLLECT(DISTINCT request{
            armID: arm.id,
            armName: arm.name,
            accessStatus: request.accessStatus,
            requestDate: request.requestDate,
            reviewAdminName: reviewer.firstName + " " + reviewer.lastName,
            reviewDate: request.reviewDate,
            comment: request.comment
        }) END as acl
        RETURN {
            firstName: user.firstName,
            lastName: user.lastName,
            organization: user.organization,
            userID: user.userID,
            email: user.email,
            IDP: user.IDP,
            role: user.role,
            userStatus: user.userStatus,
            creationDate: user.creationDate,
            editDate: user.editDate,
            acl: acl
        } AS user
        `
    const result = await runNeo4jQuery(parameters, cypher, 'user');
    return result[0];
}

async function getUserByID(userID) {
    let parameters = {userID};
    const cypher =
        `
        MATCH (user:User)
        WHERE user.userID = $userID
        OPTIONAL MATCH (user)<-[:of_user]-(request:Access)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(request)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(request)
        WITH user, COLLECT(DISTINCT request{
            armID: arm.id,
            armName: arm.name,
            accessStatus: request.accessStatus,
            requestDate: request.requestDate,
            reviewAdminName: reviewer.firstName + " " + reviewer.lastName,
            reviewDate: request.reviewDate,
            comment: request.comment
        }) as acl
        RETURN {
            firstName: user.firstName,
            lastName: user.lastName,
            organization: user.organization,
            userID: user.userID,
            email: user.email,
            IDP: user.IDP,
            role: user.role,
            userStatus: user.userStatus,
            creationDate: user.creationDate,
            editDate: user.editDate,
            acl: acl
        } AS user
        `
    const result = await runNeo4jQuery(parameters, cypher, 'user');
    return result[0];
}

async function getUserByEmailIDP(email, IDP) {
    let parameters = {email, IDP};
    const cypher =
        `
        MATCH (user:User)
        WHERE user.email = $email AND user.IDP = $IDP
        OPTIONAL MATCH (user)<-[:of_user]-(request:Access)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(request)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(request)
        WITH user, COLLECT(DISTINCT request{
            armID: arm.id,
            armName: arm.name,
            accessStatus: request.accessStatus,
            requestDate: request.requestDate,
            reviewAdminName: reviewer.firstName + " " + reviewer.lastName,
            reviewDate: request.reviewDate,
            comment: request.comment
        }) as acl
        RETURN {
            firstName: user.firstName,
            lastName: user.lastName,
            organization: user.organization,
            userID: user.userID,
            email: user.email,
            IDP: user.IDP,
            role: user.role,
            userStatus: user.userStatus,
            creationDate: user.creationDate,
            editDate: user.editDate,
            acl: acl
        } AS user
        `
    const result = await runNeo4jQuery(parameters, cypher, 'user');
    return result[0];
}

async function listUsers(parameters) {
    const cypher =
    `
        MATCH (arm:Arm) 
        WITH COUNT(DISTINCT arm) AS totalNumOfArms
        MATCH (user:User)
        WHERE ($role = [] OR user.role IN $role) AND ($userStatus = [] OR user.userStatus IN $userStatus)
        OPTIONAL MATCH (user)<-[:of_user]-(access:Access)
        WHERE $accessStatus = [] OR access.accessStatus IN $accessStatus
        WITH user, access, totalNumOfArms
        OPTIONAL MATCH (access)-[:of_arm]->(arm:Arm)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(access)
        WITH user, 
            user.lastName + ', ' + user.firstName AS displayName, 
            CASE WHEN user.role = '${ADMIN}' THEN totalNumOfArms ELSE COUNT(DISTINCT arm) END AS numberOfArms,
            COLLECT(DISTINCT access{
                armID: arm.id,
                armName: arm.name,
                accessStatus: access.accessStatus,
                requestDate: access.requestDate,
                reviewAdminName: reviewer.firstName + " " + reviewer.lastName,
                reviewDate: access.reviewDate,
                comment: access.comment
            }) as acl
        RETURN {
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: displayName,
            organization: user.organization,
            userID: user.userID,
            email: user.email,
            IDP: user.IDP,
            role: user.role,
            userStatus: user.userStatus,
            creationDate: user.creationDate,
            editDate: user.editDate,
            numberOfArms: numberOfArms,
            acl: acl
        } AS user
    `
    return await runNeo4jQuery(parameters, cypher, 'user');
}

async function listArms(parameters) {
    const cypher =
    `
        MATCH (arm: Arm)
        RETURN {
            id: arm.id,
            name: arm.name
        } AS arms
    `
    return await runNeo4jQuery(parameters, cypher, 'arms');
}

//Mutations
async function requestArmAccess(listParams, userInfo) {
    const promises = listParams.map(async (param) => {
        const cypher =
            `
            MATCH (user:User) 
            WHERE user.email='${userInfo.email}' and user.IDP ='${userInfo.IDP}'
            OPTIONAL MATCH (user)<-[:of_user]-(access:Access)-[:of_arm]->(arm)
            WHERE arm.id=$armID AND access.accessStatus IN ['${REJECTED}', '${REVOKED}']
            DETACH DELETE access
            WITH user
            OPTIONAL MATCH (arm:Arm) WHERE arm.id=$armID
            MERGE (user)<-[:of_user]-(access:Access)-[:of_arm]->(arm)
            SET access.accessStatus= $accessStatus
            SET access.requestDate= '${getTimeNow()}'
            SET access.requestID= $requestID
            RETURN access 
            `
        return await runNeo4jQuery(param, cypher, 'access');
    });
    return await Promise.all(promises);
}

// Searching for valid arms excluding approved or requested arm
async function searchValidRequestArm(parameters, user) {
    const cypher =
        `
        MATCH (user:User)
        WHERE user.email='${user.email}' and user.IDP ='${user.IDP}'
        MATCH (user)<-[:of_user]-(req:Access)
        WHERE req.accessStatus in $invalidStatus
        MATCH (req)-[:of_arm]->(userArm:Arm)
        WITH COLLECT(DISTINCT userArm.id) as invalidArmIds
        MATCH (arm:Arm)
        WHERE arm.id IN $armIDs and not arm.id in invalidArmIds
        RETURN DISTINCT arm
        `
    const result = await runNeo4jQuery(parameters, cypher, 'arm');
    const arms = [];
    result.forEach(x => arms.push(x.properties));
    return arms;
}

async function registerUser(parameters) {
    const cypher =
        `
        CREATE (user:User {
            firstName: $firstName,
            lastName: $lastName,
            email: $email,
            IDP: $IDP,
            organization: $organization,
            userID: $userID,
            creationDate: '${getTimeNow()}',
            editDate: '',
            userStatus: $status,
            role: $role
        }) 
        RETURN user
    `
    const result = await runNeo4jQuery(parameters, cypher, 'user');
    return result[0].properties;
}

async function approveAccess(parameters) {
    const cypher =
    `  
        MATCH (user:User)
        WHERE user.userID = $userID
        MATCH (arm:Arm)<-[:of_arm]-(access:Access)-[:of_user]->(user)
        WHERE arm.id IN $armIDs
        WITH arm, access, user
        OPTIONAL MATCH (access)-[r:approved_by]->()
        DELETE r
        WITH arm, access, user
        MATCH (reviewer:User)
        WHERE reviewer.email = $reviewerEmail AND reviewer.IDP = $reviewerIDP
        CREATE (access)-[:approved_by]->(reviewer)
        SET access.accessStatus = '${APPROVED}'
        SET access.approvedBy = reviewer.userID
        SET access.reviewDate = $reviewDate
        SET access.comment = $comment
        WITH user, access, arm, reviewer,
        CASE WHEN user.role = '${NON_MEMBER}' THEN '${MEMBER}' ELSE user.role END AS newRole,
        CASE WHEN user.userStatus IN ["", '${INACTIVE}'] THEN '${ACTIVE}' ELSE user.userStatus END AS newStatus
        SET user.userStatus = newStatus
        SET user.role = newRole
        WITH COLLECT(DISTINCT {
            armID: arm.id,
            armName: arm.name,
            accessStatus: access.accessStatus,
            requestDate: access.requestDate,
            reviewAdminName: reviewer.firstName + ' ' + reviewer.lastName,
            reviewDate: access.reviewDate,
            comment: access.comment
        }) AS acl
        RETURN acl    
    `
    let result = await runNeo4jQuery(parameters, cypher, 'acl');
    return result[0];
}

async function rejectAccess(parameters) {
    const cypher =
        `  
        MATCH (user:User)
        WHERE user.userID = $userID
        MATCH (arm:Arm)<-[:of_arm]-(access:Access)-[:of_user]->(user)
        WHERE arm.id IN $armIDs
        WITH arm, access, user
        MATCH (reviewer:User)
        WHERE reviewer.email = $reviewerEmail AND reviewer.IDP = $reviewerIDP
        CREATE (access)-[:approved_by]->(reviewer)
        SET access.accessStatus = '${REJECTED}'
        SET access.approvedBy = reviewer.userID
        SET access.reviewDate = $reviewDate
        SET access.comment = $comment
        WITH COLLECT(DISTINCT {
            armID: arm.id,
            armName: arm.name,
            accessStatus: access.accessStatus,
            requestDate: access.requestDate,
            reviewAdminName: reviewer.firstName + ' ' + reviewer.lastName,
            reviewDate: access.reviewDate,
            comment: access.comment
        }) AS acl
        RETURN acl    
    `
    let result = await runNeo4jQuery(parameters, cypher, 'acl');
    return result[0];
}

async function revokeAccess(parameters) {
    const cypher =
        `
            MATCH (user:User)
            WHERE user.userID = $userID
            OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(remaining:Access)-[:of_user]->(user)
            WHERE NOT(arm.id IN $armIDs) AND remaining.accessStatus = '${APPROVED}'
            WITH CASE 
                WHEN COUNT(DISTINCT remaining) < 1
                THEN '${INACTIVE}'
                ELSE user.userStatus
            END AS newStatus 
            MATCH (reviewer:User)
            WHERE reviewer.email = $reviewerEmail AND reviewer.IDP = $reviewerIDP
            WITH newStatus, reviewer.firstName + " " + reviewer.lastName AS adminName, reviewer.userID AS adminID
            MATCH (user:User)
            WHERE user.userID = $userID 
            MATCH (arm:Arm)<-[:of_arm]-(revoked:Access)-[:of_user]->(user)
            WHERE arm.id IN $armIDs AND revoked.accessStatus = '${APPROVED}'
            WITH newStatus, adminName, adminID, revoked, user, arm
            OPTIONAL MATCH (revoked)-[r:approved_by]->()
            DELETE r
            WITH newStatus, adminName, adminID, revoked, user, arm
            MATCH (reviewer:User)
            WHERE reviewer.userID = adminID
            CREATE (revoked)-[:approved_by]->(reviewer)
            SET revoked.accessStatus = '${REVOKED}'
            SET revoked.reviewDate = $reviewDate
            SET revoked.approvedBy = adminID
            SET revoked.comment = $comment
            SET user.userStatus = newStatus
            RETURN COLLECT(DISTINCT revoked{
                armID: arm.id,
                armName: arm.name,
                accessStatus: revoked.accessStatus,
                requestDate: revoked.requestDate,
                reviewAdminName: adminName,
                reviewDate: revoked.reviewDate,
                comment: revoked.comment
            }) AS acl
        `
    let result =  await runNeo4jQuery(parameters, cypher, 'acl');
    return result[0];
}



async function editUser(parameters) {
    let cypher =
        `
        MATCH (user:User)
        WHERE 
            user.userID = $userID
        SET user.editDate = $editDate
        `;
    const cypher_return =
        `
        WITH user
        OPTIONAL MATCH (user)<-[:of_user]-(request:Access)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(request)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(request)
        WITH user, COLLECT(DISTINCT request{
            armID: arm.id,
            armName: arm.name,
            accessStatus: request.accessStatus,
            requestDate: request.requestDate,
            reviewAdminName: reviewer.firstName + " " + reviewer.lastName,
            reviewDate: request.reviewDate,
            comment: request.comment
        }) as acl
        RETURN {
            firstName: user.firstName,
            lastName: user.lastName,
            organization: user.organization,
            userID: user.userID,
            email: user.email,
            IDP: user.IDP,
            role: user.role,
            userStatus: user.userStatus,
            creationDate: user.creationDate,
            editDate: user.editDate,
            acl: acl
        } AS user
        `;
    if (parameters.role) {
        cypher = cypher +
        `
            SET user.role = $role
        `
    }
    if (parameters.userStatus === "" || parameters.userStatus) {
        cypher = cypher +
        `
            SET user.userStatus = $userStatus
        `
    }
    cypher = cypher + cypher_return;
    const result = await runNeo4jQuery(parameters, cypher, 'user');
    return result[0];
}

async function updateMyUser(parameters, userInfo) {
    const isRequiredTimeUpdate = ![parameters.firstName, parameters.lastName, parameters.organization].every((p)=>(isUndefined(p)));
    const cypher =
        `
        MATCH (user:User)
        WHERE
            user.email = '${userInfo.email}' AND user.IDP = '${userInfo.IDP}'
        ${!isUndefined(parameters.firstName) ? 'SET user.firstName = $firstName' : ''}
        ${!isUndefined(parameters.lastName) ? 'SET user.lastName = $lastName' : ''}
        ${!isUndefined(parameters.organization) ? 'SET user.organization = $organization' : ''}
        ${isRequiredTimeUpdate ? `SET user.editDate = '${getTimeNow()}'` : ''} 
        WITH user
        OPTIONAL MATCH (user)<-[:of_user]-(access:Access)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(access)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(access)
        WITH user, COLLECT(DISTINCT access{
            armID: arm.id,
            armName: arm.name,
            accessStatus: access.accessStatus,
            requestDate: access.requestDate,
            reviewAdminName: reviewer.firstName + " " + reviewer.lastName,
            reviewDate: access.reviewDate,
            comment: access.comment
        }) as acl
        RETURN {
            firstName: user.firstName,
            lastName: user.lastName,
            organization: user.organization,
            userID: user.userID,
            email: user.email,
            IDP: user.IDP,
            role: user.role,
            userStatus: user.userStatus,
            creationDate: user.creationDate,
            editDate: user.editDate,
            acl: acl
        } AS user
        `;
    const result = await runNeo4jQuery(parameters, cypher, 'user');
    return result[0];
}

async function getArmNamesFromArmIds(armIds) {
    const cypher =
    `
        MATCH (arm:Arm)
        WHERE arm.id IN $armIds
        WITH COLLECT(DISTINCT arm.name) as names
        RETURN names
    `;
    const result = await runNeo4jQuery({armIds: armIds}, cypher, 'names');
    return result[0];
}

async function getArmsFromArmIds(armIds) {
    const cypher =
        `
        MATCH (arm:Arm)
        WHERE arm.id IN $armIds
        RETURN arm AS arms
    `;
    return await runNeo4jQuery({armIds: armIds}, cypher, 'arms');
}

async function listRequest(parameters){
    const cypher =
    `
        MATCH (user:User)<-[:of_user]-(access:Access)-[:of_arm]->(arm:Arm)
        WHERE 
            (NOT user.role IN ['${ADMIN}']) AND 
            (access.accessStatus IN $accessStatus OR $accessStatus = []) AND 
            (access.requestID IN $requestID OR $requestID = [])
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(access)
        WITH 
            user, access, 
            user.lastName + ', ' + user.firstName AS displayName,
            access {
                armID: arm.id,
                armName: arm.name,
                accessStatus: access.accessStatus,
                requestDate: access.requestDate,
                reviewAdminName: reviewer.firstName + " " + reviewer.lastName,
                reviewDate: access.reviewDate,
                comment: access.comment,
                requestID: access.requestID
            } AS acl
        RETURN {
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: displayName,
            organization: user.organization,
            userID: user.userID,
            email: user.email,
            IDP: user.IDP,
            role: user.role,
            userStatus: user.userStatus,
            numberOfArms: COUNT(*),
            requestID: access.requestID,
            requestDate: access.requestDate,
            acl: COLLECT(DISTINCT acl)
        } as user
    `;
    return await runNeo4jQuery(parameters, cypher, 'user');
}

async function disableAdminRole(params, newRole) {
    const cypher =
        `  
        MATCH (u: User)
        WHERE u.role='${ADMIN}' and u.userID in $ids
        SET u.role='${newRole}'
        RETURN COLLECT(DISTINCT {
            userEmail: u.email,
            IDP: u.IDP,
            role: u.role
        }) as user
        `
    const result = await runNeo4jQuery(params, cypher, 'user');
    return result[0];
}

async function disableUsers(params) {
    const cypher =
        `
        MATCH (u: User)
        WHERE u.userID IN $ids
        SET u.userStatus='${DISABLED}'
        RETURN COLLECT(DISTINCT {
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            organization: u.organization,
            userEmail: u.email,
            IDP: u.IDP,
            userStatus: u.userStatus
        }) as user
        `
    const result = await runNeo4jQuery(params, cypher, 'user');
    return result[0];
}

async function getInactiveUsers() {
    const cypher =
        `
        MATCH (e:Event)
        WHERE
            e.event_type = '${LOGIN}' AND
            // 86400 * 1000 millisecond = 1 day
            toInteger(e.timestamp) + (86400 * 1000 * ${config.inactive_user_days}) > toInteger(timestamp())
        WITH COLLECT(DISTINCT e.user_id) AS activeUsers
        MATCH (u:User)
        WHERE
            NOT u.userStatus = '${DISABLED}'
        WITH COLLECT(DISTINCT u.userID) AS enabledUsers, activeUsers
        MATCH (u:User)
        WHERE
            u.userID IN enabledUsers AND
            NOT u.userID IN activeUsers
        RETURN COLLECT(DISTINCT {
            userID: u.userID,
            firstName: u.firstName,
            lastName: u.lastName,
            userEmail: u.email,
            IDP: u.IDP,
            role: u.role,
            organization: u.organization
        }) as user
        `
    const result = await runNeo4jQuery({}, cypher, 'user');
    return result[0];
}

async function getRecentEventsNeo4j(limit){
    return await getRecentEvents(driver, limit)
}

async function wipeDatabase() {
    return await runNeo4jQuery({}, `MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE r,n`, {})
}

async function runNeo4jQuery(parameters, cypher, returnLabel) {
    return await executeQuery(driver, parameters, cypher, returnLabel);
}

const logEventNeo4j = async function(bentoEvent){
    return await logEvent(driver, bentoEvent)
};

module.exports = {
    getMyUser,
    getUserByID,
    listUsers,
    registerUser,
    rejectAccess,
    approveAccess,
    editUser,
    wipeDatabase,
    checkUnique,
    getAdminEmails,
    listArms,
    revokeAccess,
    updateMyUser,
    getAccesses,
    requestArmAccess,
    searchValidRequestArm,
    createArms,
    getArmNamesFromArmIds,
    listRequest,
    getInactiveUsers,
    disableUsers,
    disableAdminRole,
    getAdmins,
    getArmsFromArmIds,
    logEventNeo4j,
    getUserByEmailIDP,
    getRecentEventsNeo4j
};
