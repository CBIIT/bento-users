const {buildSchema} = require('graphql');
const data_interface = require('./data-interface');
const {graphqlHTTP} = require("express-graphql");
const {errorType} = require('./graphql-api-constants');
const {INACTIVE, NON_MEMBER, ACTIVE, DISABLED, DELETED, ADMIN, MEMBER} = require("../constants/user-constant");
const {PENDING, APPROVED, REJECTED, REVOKED} = require("../constants/access-constant");


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

const formatMap = {
    "pending": PENDING,
    "approved": APPROVED,
    "rejected": REJECTED,
    "revoked": REVOKED,
    "inactive": INACTIVE,
    "active": ACTIVE,
    "disabled": DISABLED,
    "deleted": DELETED,
    "admin": ADMIN,
    "member": MEMBER,
    "non-member": NON_MEMBER
}

module.exports = graphqlHTTP((req, res) => {
    req.body.variables = formatVariables(req.body.variables, ["role", "userStatus", "accessStatus"]);
    return {
        graphiql: true,
        schema: schema,
        rootValue: root,
        context: {
            userInfo: req.session.userInfo
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

function formatVariables(variables, lowerCaseParamsList){
    for (let key in variables) {
        if (!lowerCaseParamsList.includes(key)) {
            continue;
        }
        else if (Array.isArray(variables[key]) && variables[key].every(x => typeof x === "string")) {
            variables[key] = variables[key].map(x => formatSingleVariable(x));
        }
        else if (typeof variables[key] === "string") {
            variables[key] = formatSingleVariable(variables[key]);
        }
    }
    return variables;
}

function formatSingleVariable(variable) {
    let key = variable.toLowerCase();
    if (formatMap[key]){
        return formatMap[key];
    }
    return variable;
}