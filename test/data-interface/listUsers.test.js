const {Neo4jService} = require("../../data-management/neo4j-service");
const {DataInterface} = require("../../data-management/data-interface");
const {errorName} = require("../../data-management/graphql-api-constants");
const {ADMIN, ACTIVE, MEMBER, NON_MEMBER, NONE} = require("../../bento-event-logging/const/user-constant");
const {GOOGLE} = require("../../bento-event-logging/const/idp-constant");
const {createToken} = require("../../services/tokenizer");
const {v4} = require("uuid");
const config = require('../../config');


jest.mock("../../data-management/neo4j-service");
const neo4jService = new Neo4jService();
const dataInterface = new DataInterface(neo4jService);

describe(' list users API test', () => {
    let myUser, otherUser, context;

    beforeEach(() => {
        let email = "test@email.com";
        let IDP = GOOGLE;
        context = {
            req: {
                headers: {
                    authorization: null
                }
            },
            userInfo: {
                email,
                IDP
            }
        };
        myUser = {
            lastName: 'last',
            firstName: 'first',
            role: ADMIN,
            userStatus: ACTIVE,
            IDP,
            organization: "org",
            tokens: [],
            acl: [],
            creationDate: "creation",
            editDate: "edit",
            userID: "testID",
            email
        };
        otherUser = {
            ...myUser,
            role: MEMBER,
            userID: "testID2",
            email: "test2@email.com"
        };
    });

    test('no token, user not logged in', async () => {
        let userList = [myUser, otherUser];
        context.userInfo = {};
        neo4jService.getMyUser.mockImplementation(() => {
            return null;
        });
        expect(dataInterface.listUsers({}, context)).rejects.toThrow(errorName.NOT_LOGGED_IN);
    });

    test('non-admin user token', async () => {
        //setup
        let userList = [myUser, otherUser];
        const uuid = v4();
        const tokenSecret = "secret";
        context.userInfo.uuid = uuid;
        neo4jService.getUserTokenUUIDs.mockImplementation(() => {
            return [uuid];
        });
        neo4jService.listUsers.mockImplementation(() => {
            return userList;
        });
        // role = Member
        neo4jService.getMyUser.mockImplementation(() => {
            myUser.role = MEMBER;
            myUser.tokens = [uuid];
            return myUser;
        });
        expect(dataInterface.listUsers({}, context)).rejects.toThrow(errorName.NOT_AUTHORIZED);
        // role = Non-Member
        neo4jService.getMyUser.mockImplementation(() => {
            myUser.role = NON_MEMBER;
            myUser.tokens = [uuid];
            return myUser;
        });
        // role = undefined
        expect(dataInterface.listUsers({}, context)).rejects.toThrow(errorName.NOT_AUTHORIZED);
        neo4jService.getMyUser.mockImplementation(() => {
            myUser.role = undefined;
            myUser.tokens = [uuid];
            return myUser;
        });
        expect(dataInterface.listUsers({}, context)).rejects.toThrow(errorName.NOT_AUTHORIZED);
    });

    test('admin user token revoked', async () => {
        let userList = [myUser, otherUser];
        const uuid = v4();
        context.userInfo.uuid = uuid;
        config.token_secret = "secret";
        const token = createToken(context.userInfo, config.token_secret, 600);
        context.req.headers.authorization = "Bearer " + token;
        neo4jService.getMyUser.mockImplementation(() => {
            return myUser;
        });
        neo4jService.getUserTokenUUIDs.mockImplementation(() => {
            return [];
        });
        neo4jService.listUsers.mockImplementation(() => {
            return userList;
        });
        expect(dataInterface.listUsers({}, context)).rejects.toThrow(errorName.NOT_VALID_TOKEN);
    });

    test('admin user token', async () => {
        let userList = [myUser, otherUser];
        const uuid = v4();
        context.userInfo.uuid = uuid;
        config.token_secret = "secret";
        const token = createToken(context.userInfo, config.token_secret, 600);
        context.req.headers.authorization = "Bearer " + token;
            neo4jService.getMyUser.mockImplementation(() => {
            myUser.tokens = [uuid];
            return myUser;
        });
        neo4jService.getUserTokenUUIDs.mockImplementation(() => {
            return [uuid];
        });
        neo4jService.listUsers.mockImplementation(() => {
            return userList;
        });
        expect(await dataInterface.listUsers({}, context)).toStrictEqual(userList);
    });

    test('invalid admin user token', async () => {
        let userList = [myUser, otherUser];
        const uuid = v4();
        context.userInfo.uuid = uuid;
        config.token_secret = "secret";
        const token = createToken(context.userInfo, "invalid secret", 600);
        context.req.headers.authorization = "Bearer " + token;
        neo4jService.getMyUser.mockImplementation(() => {
            myUser.tokens = [uuid];
            return myUser;
        });
        neo4jService.getUserTokenUUIDs.mockImplementation(() => {
            return [uuid];
        });
        neo4jService.listUsers.mockImplementation(() => {
            return userList;
        });
        expect(dataInterface.listUsers({}, context)).rejects.toThrow(errorName.NOT_VALID_TOKEN);
    });

    test('no token, admin user logged in', async () => {
        let userList = [myUser, otherUser];
        neo4jService.getMyUser.mockImplementation(() => {
            return myUser;
        });
        neo4jService.getUserTokenUUIDs.mockImplementation(() => {
            return [];
        });
        neo4jService.listUsers.mockImplementation(() => {
            return userList;
        });
        expect(await dataInterface.listUsers({}, context)).toStrictEqual(userList);
    });

    test('test parameters are unaltered', async () => {
        let params = "test params";
        neo4jService.getMyUser.mockImplementation(() => {
            return myUser;
        });
        neo4jService.getUserTokenUUIDs.mockImplementation(() => {
            return [];
        });
        neo4jService.listUsers.mockImplementation((params) => {
            return params;
        });
        expect(await dataInterface.listUsers(params, context)).toStrictEqual(params);
    });
});
