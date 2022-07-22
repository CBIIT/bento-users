const neo4j = require('neo4j-driver');
const config = require('../config');
const {getTimeNow} = require("../util/time-util");
const {isUndefined} = require("../util/string-util");
const driver = neo4j.driver(
    config.NEO4J_URI,
    neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
    {disableLosslessIntegers: true}
);

//Queries
async function getAccesses(userID, accessStatuses){
    let parameters = {userID, accessStatuses};
    const cypher =
    `
        MATCH (u:User)
        WHERE u.userID = $userID
        MATCH (arm:Arm)<-[:of_arm]-(a:Access)-[:of_user]->(u)
        WHERE a.accessStatus IN $accessStatuses
        RETURN COLLECT(DISTINCT arm.armID) AS result
    `
    const result = await executeQuery(parameters, cypher, 'result');
    return result[0];
}

async function getAdminEmails() {
    const cypher =
        `
        MATCH (n:User)
        WHERE n.role = 'admin' AND n.status = 'approved'
        RETURN COLLECT(DISTINCT n.email) AS result
    `
    const result = await executeQuery({}, cypher, 'result');
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
    const result = await executeQuery(parameters, cypher, 'result');
    return result[0];
}

async function checkAlreadyApproved(userID) {
    return checkStatus(userID, 'approved');
}

async function checkAlreadyRejected(userID) {
    return checkStatus(userID, 'rejected');
}

async function checkStatus(userID, status) {
    let parameters = {userID: userID, status: status};
    const cypher =
        `
        MATCH (n:User)
            WHERE n.userID = $userID
        RETURN n.status = $status as result
    `
    const result = await executeQuery(parameters, cypher, 'result');
    return result[0];
}

async function getMyUser(parameters) {
    const cypher =
        `
        MATCH (user:User)
        WHERE user.email = $email AND user.IDP = $idp
        OPTIONAL MATCH (user)<-[:of_user]-(request:Access)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(request)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(request)
        WITH user, COLLECT(DISTINCT request{
            armID: arm.armID,
            armName: arm.armName,
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
    const result = await executeQuery(parameters, cypher, 'user');
    return result[0];
}

async function getUser(parameters) {
    const cypher =
        `
        MATCH (user:User)
        WHERE user.userID = $userID
        OPTIONAL MATCH (user)<-[:of_user]-(request:Access)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(request)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(request)
        WITH user, COLLECT(DISTINCT request{
            armID: arm.armID,
            armName: arm.armName,
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
    const result = await executeQuery(parameters, cypher, 'user');
    return result[0];
}

async function listUsers(parameters) {
    const cypher =
    `
        MATCH (user:User)
        WHERE ($role = [] or user.role IN $role) AND ($userStatus = [] or user.userStatus IN $userStatus)
        OPTIONAL MATCH (user)<-[:of_user]-(request:Access)
        WITH user, request
        WHERE ($accessStatus = [] or request.accessStatus IN $accessStatus)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(request)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(request)
        WITH user, COUNT(DISTINCT request) AS numberOfArms, user.lastName + ', ' + user.firstName AS displayName,
        COLLECT(DISTINCT request{
            armID: arm.armID,
            armName: arm.armName,
            accessStatus: request.accessStatus,
            requestDate: request.requestDate,
            reviewAdminName: reviewer.firstName + " " + reviewer.lastName,
            reviewDate: request.reviewDate,
            comment: request.comment
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
    return await executeQuery(parameters, cypher, 'user');
}

async function listArms(parameters) {
    const cypher =
    `
        MATCH (arm: Arm)
        RETURN {
            id: arm.armID,
            name: arm.armName
        } AS arms
    `
    return await executeQuery(parameters, cypher, 'arms');
}

//Mutations
async function requestArmAccess(listParams, userInfo) {
    const promises = listParams.map(async (param) => {
        const cypher =
            `
            MATCH (user:User) WHERE user.email='${userInfo.email}' and user.IDP ='${userInfo.idp}'
            OPTIONAL MATCH (arm:Arm) WHERE arm.armID=$armID
            MERGE (user)<-[:of_user]-(access:Access)-[:of_arm]->(arm)
            SET access.accessStatus= $accessStatus
            SET access.requestDate= '${getTimeNow()}'
            RETURN access
            `
        return await executeQuery(param, cypher, 'access');
    });
    return await Promise.all(promises);
}

// Searching for valid arms excluding approved or requested arm
async function searchValidRequestArm(parameters, user) {
    const cypher =
        `
        MATCH (user:User)-[*..1]-(req:Access)-[*..1]-(userArm:Arm)
        WHERE user.email='${user.getEmail()}' and user.IDP ='${user.getIDP()}' and req.accessStatus in $invalidStatus
        WITH [x IN COLLECT(DISTINCT userArm)| x.armID] as invalidArmIds
        
        MATCH (arm:Arm)
        WHERE arm.armID IN $armIDs and not arm.armID in invalidArmIds
        OPTIONAL MATCH (arm)<-[:of_arm]-(r:Access)
        RETURN DISTINCT arm
        `
    const result = await executeQuery(parameters, cypher, 'arm');
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
            IDP: $idp,
            organization: $organization,
            userID: $userID,
            creationDate: '${getTimeNow()}',
            editDate: '',
            userStatus: $status,
            role: $role
        }) 
        RETURN user
    `
    const result = await executeQuery(parameters, cypher, 'user');
    return result[0].properties;
}

async function approveAccess(parameters) {
    const cypher =
    `  
        MATCH (user:User)
        WHERE user.userID = $userID
        MATCH (arm:Arm)<-[:of_arm]-(access:Access)-[:of_user]->(user)
        WHERE arm.armID IN $armIDs
        MATCH (reviewer:User)
        WHERE reviewer.email = $reviewerEmail AND reviewer.IDP = $reviewerIDP
        CREATE (access)-[:approved_by]->(reviewer)
        SET access.accessStatus = 'approved'
        SET access.approvedBy = reviewer.userID
        SET access.reviewDate = $reviewDate
        SET access.comment = $comment
        WITH user, access, arm, reviewer,
        CASE WHEN user.role = "non-member" THEN "member" ELSE user.role END AS newRole,
        CASE WHEN user.userStatus IN ["", "inactive"] THEN "active" ELSE user.userStatus END AS newStatus
        SET user.userStatus = newStatus
        SET user.role = newRole
        WITH COLLECT(DISTINCT {
            armID: arm.armID,
            armName: arm.armName,
            accessStatus: access.accessStatus,
            requestDate: access.requestDate,
            reviewAdminName: reviewer.firstName + ' ' + reviewer.lastName,
            reviewDate: access.reviewDate,
            comment: access.comment
        }) AS acl
        RETURN acl    
    `
    let result = await executeQuery(parameters, cypher, 'acl');
    return result[0];
}

async function rejectAccess(parameters) {
    const cypher =
        `  
        MATCH (user:User)
        WHERE user.userID = $userID
        MATCH (arm:Arm)<-[:of_arm]-(access:Access)-[:of_user]->(user)
        WHERE arm.armID IN $armIDs
        WITH arm, access, user
        MATCH (reviewer:User)
        WHERE reviewer.email = $reviewerEmail AND reviewer.IDP = $reviewerIDP
        CREATE (access)-[:approved_by]->(reviewer)
        SET access.accessStatus = 'rejected'
        SET access.approvedBy = reviewer.userID
        SET access.reviewDate = $reviewDate
        SET access.comment = $comment
        WITH COLLECT(DISTINCT {
            armID: arm.armID,
            armName: arm.armName,
            accessStatus: access.accessStatus,
            requestDate: access.requestDate,
            reviewAdminName: reviewer.firstName + ' ' + reviewer.lastName,
            reviewDate: access.reviewDate,
            comment: access.comment
        }) AS acl
        RETURN acl    
    `
    let result = await executeQuery(parameters, cypher, 'acl');
    return result[0];
}

async function resetApproval(parameters) {
    const cypher =
        `
        MATCH (user:User)
        WHERE 
            user.userID = $userID
        SET user.status = 'registered'
        SET user.rejectionDate = Null
        SET user.approvalDate = Null
        SET user.comment = Null
        RETURN user
    `
    const result = await executeQuery(parameters, cypher, 'user');
    if (result && result[0]) {
        return result[0].properties;
    }
    return;
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
            armID: arm.armID,
            armName: arm.armName,
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
    const result = await executeQuery(parameters, cypher, 'user');
    return result[0];
}

async function updateMyUser(parameters, userInfo) {
    const isRequiredTimeUpdate = ![parameters.firstName, parameters.lastName, parameters.organization].every((p)=>(isUndefined(p)));
    const cypher =
        `
        MATCH (user:User)
        WHERE
            user.email = '${userInfo.email}' AND user.IDP = '${userInfo.idp}'
        ${!isUndefined(parameters.firstName) ? 'SET user.firstName = $firstName' : ''}
        ${!isUndefined(parameters.lastName) ? 'SET user.lastName = $lastName' : ''}
        ${!isUndefined(parameters.organization) ? 'SET user.organization = $organization' : ''}
        ${isRequiredTimeUpdate ? `SET user.editDate = '${getTimeNow()}'` : ''} 
        WITH user
        OPTIONAL MATCH (user)<-[:of_user]-(access:Access)
        OPTIONAL MATCH (reviewer:User)<-[:approved_by]-(access)
        OPTIONAL MATCH (arm:Arm)<-[:of_arm]-(access)
        WITH user, COLLECT(DISTINCT access{
            armID: arm.armID,
            armName: arm.armName,
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
    const result = await executeQuery(parameters, cypher, 'user');
    return result[0];
}

// async function updateMyUser(parameters) {
//     const cypher =
//         `
//         MATCH (user:User)
//         WHERE
//             user.email = $email
//         SET user.firstName = $firstName
//         SET user.lastName = $lastName
//         SET user.email = $email
//         SET user.IDP = $IDP
//         SET user.organization = $organization
//         SET user.editDate = $editDate
//         RETURN user
//     `
//     const result = await executeQuery(parameters, cypher, 'user');
//     return result[0].properties;
// }
//
// async function deleteUser(parameters) {
//     const cypher =
//     `
//         MATCH (user:User)
//         WHERE
//             user.userID = $userID
//         SET user.status = "deleted"
//         RETURN user
//     `
//     const result = await executeQuery(parameters, cypher, 'user');
//     return result[0].properties;
// }
//
// async function disableUser(parameters) {
//     const cypher =
//     `
//         MATCH (user:User)
//         WHERE
//             user.userID = $userID
//         SET user.status = "disabled"
//         RETURN user
//     `
//     const result = await executeQuery(parameters, cypher, 'user');
//     return result[0].properties;
// }


async function wipeDatabase() {
    return await executeQuery({}, `MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE r,n`, {})
}

async function executeQuery(parameters, cypher, returnLabel) {
    const session = driver.session();
    const tx = session.beginTransaction();
    try {
        const result = await tx.run(cypher, parameters);
        return result.records.map(record => {
            return record.get(returnLabel)
        })
    } catch (error) {
        throw error;
    } finally {
        try {
            await tx.commit();
        } catch (err) {
        }
        await session.close();
    }
}

//Exported functions
exports.getMyUser = getMyUser
exports.getUser = getUser
exports.listUsers = listUsers
exports.registerUser = registerUser
exports.rejectAccess = rejectAccess
exports.approveAccess = approveAccess
exports.editUser = editUser
exports.wipeDatabase = wipeDatabase
exports.checkUnique = checkUnique
exports.getAdminEmails = getAdminEmails
exports.checkAlreadyApproved = checkAlreadyApproved
exports.checkAlreadyRejected = checkAlreadyRejected
exports.resetApproval = resetApproval
exports.listArms = listArms
exports.updateMyUser = updateMyUser
exports.getAccesses = getAccesses
exports.requestArmAccess = requestArmAccess
exports.searchValidRequestArm = searchValidRequestArm
// exports.deleteUser = deleteUser
// exports.disableUser = disableUser
// exports.updateMyUser = updateMyUser