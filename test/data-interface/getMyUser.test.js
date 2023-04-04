const {GOOGLE} = require("../../bento-event-logging/const/idp-constant");
const {Neo4jService} = require("../../data-management/neo4j-service");
const {DataInterface} = require("../../data-management/data-interface");
const {getTimeNow} = require("../../util/time-util");
const {NONE, NON_MEMBER} = require("../../bento-event-logging/const/user-constant");
const {errorName} = require("../../data-management/graphql-api-constants");

jest.mock("../../data-management/neo4j-service")
const neo4jService = new Neo4jService();
const dataInterface = new DataInterface(neo4jService);
describe('getMyUser() Test', () => {
    let userInfo, context, eventsLog;
    beforeEach(() => {
        userInfo = {
            firstName: "test first name",
            lastName: "test last name",
            email: "test@email.com",
            IDP: GOOGLE,
        };
        context = {
            userInfo: userInfo
        };
        eventsLog = [];
        neo4jService.logEventNeo4j.mockImplementation((event) =>{
            eventsLog.push(event);
        });
    });

    test('test getting an existing user', async () => {
        let testUser = {
            ...userInfo,
            organization: "test org",
            userID: "test id",
            creationDate: getTimeNow(),
            editDate: "",
            userStatus: NONE,
            role: NON_MEMBER
        };
        neo4jService.checkUnique.mockImplementation(() => {
           return true;
        });
        neo4jService.getMyUser.mockImplementation(()=>{
            return testUser;
        });
        expect(await dataInterface.getMyUser({}, context)).toEqual(JSON.parse(JSON.stringify(testUser)));
        expect(eventsLog.length).toBe(0)
    });

    test('test registering a new user', async () => {
        let testUser = {
            ...userInfo,
            organization: "test org",
            userID: "test id",
            creationDate: getTimeNow(),
            editDate: "",
            userStatus: NONE,
            role: NON_MEMBER
        };
        neo4jService.checkUnique.mockImplementation(() => {
            return true;
        });
        neo4jService.getMyUser.mockImplementation(()=>{
            return undefined;
        });
        neo4jService.registerUser.mockImplementation(()=>{
            return testUser;
        });
        expect(await dataInterface.getMyUser({}, context)).toEqual(JSON.parse(JSON.stringify(testUser)));
        expect(eventsLog.length).toBe(1);
        expect(eventsLog[0].constructor.name).toBe("RegistrationEvent");
    });

    test('test registering an existing user', async () => {
        let testUser = {
            ...userInfo,
            organization: "test org",
            userID: "test id",
            creationDate: getTimeNow(),
            editDate: "",
            userStatus: NONE,
            role: NON_MEMBER
        };
        neo4jService.checkUnique.mockImplementation(() => {
            return false;
        });
        neo4jService.getMyUser.mockImplementation(()=>{
            return undefined;
        });
        neo4jService.registerUser.mockImplementation(()=>{
            return testUser;
        });
        await expect(async  () => {await dataInterface.getMyUser({}, context)}).rejects.toThrowError(errorName.NOT_UNIQUE);
        expect(eventsLog.length).toBe(0);
    });

    test('test registering an existing user', async () => {
        let testUser = {
            ...userInfo,
            organization: "test org",
            userID: "test id",
            creationDate: getTimeNow(),
            editDate: "",
            userStatus: NONE,
            role: NON_MEMBER
        };
        neo4jService.checkUnique.mockImplementation(() => {
            return false;
        });
        neo4jService.getMyUser.mockImplementation(()=>{
            return undefined;
        });
        neo4jService.registerUser.mockImplementation(()=>{
            return testUser;
        });
        await expect(async  () => {await dataInterface.getMyUser({}, context)}).rejects.toThrowError(errorName.NOT_UNIQUE);
        expect(eventsLog.length).toBe(0);
    });

    test('test missing email in user info', async () => {
        userInfo.email = undefined;
        await badUserInfoTest(errorName.NOT_LOGGED_IN);
    });

    test('test missing idp in user info', async () => {
        userInfo.IDP = undefined;
        await badUserInfoTest(errorName.NOT_LOGGED_IN);
    });

    test('test invalid IDP in user info', async () => {
        userInfo.IDP = "invalid";
        await badUserInfoTest(errorName.INVALID_IDP);
    });

    test('test user registration fails', async () => {
        let testUser = {
            ...userInfo,
            organization: "test org",
            userID: "test id",
            creationDate: getTimeNow(),
            editDate: "",
            userStatus: NONE,
            role: NON_MEMBER
        };
        neo4jService.checkUnique.mockImplementation(() => {
            return true;
        });
        neo4jService.getMyUser.mockImplementation(()=>{
            return undefined;
        });
        neo4jService.registerUser.mockImplementation(()=>{
            return undefined;
        });
        await expect(async  () => {await dataInterface.getMyUser({}, context)}).rejects.toThrowError(errorName.UNABLE_TO_REGISTER_USER);
        expect(eventsLog.length).toBe(0);
    });

    async function badUserInfoTest(error) {
        let testUser = {
            ...userInfo,
            organization: "test org",
            userID: "test id",
            creationDate: getTimeNow(),
            editDate: "",
            userStatus: NONE,
            role: NON_MEMBER
        };
        neo4jService.checkUnique.mockImplementation(() => {
            return true;
        });
        neo4jService.getMyUser.mockImplementation(()=>{
            return undefined;
        });
        neo4jService.registerUser.mockImplementation(()=>{
            return testUser;
        });
        await expect(async  () => {await dataInterface.getMyUser({}, context)}).rejects.toThrowError(error);
        expect(eventsLog.length).toBe(0);
    }
});

