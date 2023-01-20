const {buildSchema} = require('graphql');
const data_interface = require('./data-interface');
const {graphqlHTTP} = require("express-graphql");
const {errorType} = require('./graphql-api-constants');
const {formatVariables, formatMap} = require("../bento-event-logging/const/format-constants");
const {formatErrorResponse} = require("../util/error-util");

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

module.exports = graphqlHTTP((req, res) => {
    req.body.variables = formatVariables(req.body.variables, ["role", "userStatus", "accessStatus"], formatMap);
    req.session.userInfo = formatVariables(req.session.userInfo, ["IDP"], formatMap);
    return {
        graphiql: true,
        schema: schema,
        rootValue: root,
        context: req.session,
        customFormatErrorFn: (error) => {
            return formatErrorResponse(res, error);
        }
    }
});
