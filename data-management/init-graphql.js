const {buildSchema} = require('graphql');
const data_interface = require('./data-interface');
const {graphqlHTTP} = require("express-graphql");
const {errorType} = require('./graphql-api-constants');


//Read schema from schema.graphql file
const schema = buildSchema(require("fs").readFileSync("graphql/schema.graphql", "utf8"));

//Query logic
const root = {
    getMyUser: data_interface.getMyUser,
    listUsers: data_interface.listUsers,
    registerUser: data_interface.registerUser,
    approveUser: data_interface.approveUser,
    rejectUser: data_interface.rejectUser,
    editUser: data_interface.editUser,
    listArms: data_interface.listArms,
    updateMyUser: data_interface.updateMyUser,
    getUser: data_interface.getUser,
    requestAccess: data_interface.requestAccess
    // The below functions are not fully tested and verified yet and should not be used
    // updateMyUser: data_interface.updateMyUser,
    // deleteUser: data_interface.deleteUser,
    // disableUser: data_interface.disableUser,
};



module.exports = graphqlHTTP((req, res) => {
    return {
        graphiql: true,
        schema: schema,
        rootValue: root,
        context: {
            userInfo: JSON.parse(JSON.stringify(req.session.userInfo))
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
