const {buildSchema} = require('graphql');
const {formatVariables, formatMap} = require("../bento-event-logging/const/format-constants");
const {createHandler} = require("graphql-http/lib/use/express");
const {DataInterface} = require("./data-interface");
const {Neo4jService} = require("./neo4j-service");
const {neo4jDriver} = require("./neo4j-driver");

//Read schema from schema.graphql file
const schema = buildSchema(require("fs").readFileSync("graphql/schema.graphql", "utf8"));
const dataInterface = new DataInterface(new Neo4jService(neo4jDriver));

//Query logic
const root = {
    getMyUser: dataInterface.getMyUser.bind(dataInterface),
    listUsers: dataInterface.listUsers.bind(dataInterface),
    registerUser: dataInterface.registerUser.bind(dataInterface),
    rejectAccess: dataInterface.rejectAccess.bind(dataInterface),
    approveAccess: dataInterface.approveAccess.bind(dataInterface),
    revokeAccess: dataInterface.revokeAccess.bind(dataInterface),
    editUser: dataInterface.editUser.bind(dataInterface),
    listArms: dataInterface.listArms.bind(dataInterface),
    updateMyUser: dataInterface.updateMyUser.bind(dataInterface),
    getUser: dataInterface.getUser.bind(dataInterface),
    requestAccess: dataInterface.requestAccess.bind(dataInterface),
    listRequest: dataInterface.listRequest.bind(dataInterface),
    grantToken: dataInterface.grantToken.bind(dataInterface),
    invalidateToken: dataInterface.invalidateToken.bind(dataInterface)
};

module.exports = (req, res) => {
    req.body.variables = formatVariables(req.body.variables, ["role", "userStatus", "accessStatus"], formatMap);
    req.session.userInfo = formatVariables(req.session.userInfo, ["IDP"], formatMap);
    createHandler({
        schema: schema,
        rootValue: root,
        context: req.session
    })(req,res);
}
