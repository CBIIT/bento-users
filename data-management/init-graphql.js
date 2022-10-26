const {buildSchema} = require('graphql');
const data_interface = require('./data-interface');
const {graphqlHTTP} = require("express-graphql");
const {errorType, valid_idps, user_roles, user_statuses, access_statuses} = require('./graphql-api-constants');
const {INACTIVE, NON_MEMBER, ACTIVE, DISABLED, DELETED, ADMIN, MEMBER} = require("../constants/user-constant");
const {PENDING, APPROVED, REJECTED, REVOKED} = require("../constants/access-constant");
const {GOOGLE, LOGIN_GOV, TEST, NIH} = require("../constants/idp-constant");


//Read schema from schema.graphql file
const schema = buildSchema(require("fs").readFileSync("graphql/schema.graphql", "utf8"));

//Query logic
const root = {
    getMyUser: data_interface.getMyUser,
    listUsers: data_interface.listUsers,
    registerUser: data_interface.registerUser,
    rejectAccess: data_interface.rejectAccess,
    approveAccess: data_interface.approveAccess,
    revokeAccess: data_interface.revokeAccess,
    editUser: data_interface.editUser,
    listArms: data_interface.listArms,
    updateMyUser: data_interface.updateMyUser,
    getUser: data_interface.getUser,
    requestAccess: data_interface.requestAccess,
    listRequest: data_interface.listRequest
    // The below functions are not fully tested and verified yet and should not be used
    // updateMyUser: data_interface.updateMyUser,
    // deleteUser: data_interface.deleteUser,
    // disableUser: data_interface.disableUser,
};

const formatMap = initFormatMap([valid_idps, user_roles, user_statuses, access_statuses]);

module.exports = graphqlHTTP((req, res) => {
    req.body.variables = formatVariables(req.body.variables, ["role", "userStatus", "accessStatus"], formatMap);
    return {
        graphiql: true,
        schema: schema,
        rootValue: root,
        context: {
            userInfo: formatVariables(req.session.userInfo, ["idp"], formatMap)
        },
        customFormatErrorFn: (error) => {
            let status = undefined;
            let body = {error: undefined};
            try {
                status = errorType[error.message].statusCode;
                body.error = errorType[error.message].message;
            } catch (err) {
                status = 500;
                body.error = "Internal server error: "+error;
            }
            res.status(status);
            return body;
        }
    }
});

function formatVariables(variables, lowerCaseParamsList, formatMap){
    for (let key in variables) {
        if (!lowerCaseParamsList.includes(key)) {
            continue;
        }
        else if (Array.isArray(variables[key]) && variables[key].every(x => typeof x === "string")) {
            variables[key] = variables[key].map(x => formatSingleVariable(x, formatMap));
        }
        else if (typeof variables[key] === "string") {
            variables[key] = formatSingleVariable(variables[key], formatMap);
        }
    }
    return variables;
}

function initFormatMap(valuesLists){
    const formatMap = {}
    valuesLists.forEach(x => addToMap(formatMap, x));
    return formatMap
}

function addToMap(formatMap, values){
    values.forEach(x => formatMap[x.toLowerCase()] = x);
}

function formatSingleVariable(variable, formatMap) {
    let key = variable.toLowerCase();
    if (formatMap[key]){
        return formatMap[key];
    }
    return variable;
}