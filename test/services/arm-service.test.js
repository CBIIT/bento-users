const {PENDING, APPROVED} = require("../../bento-event-logging/const/access-constant");
const ArmAccess = require("../../model/arm-access");
const {getApprovedArmIDs} = require("../../services/arm-access");
const {DataInterface} = require("../../data-management/data-interface");
const {Neo4jService} = require("../../data-management/neo4j-service");
const {GOOGLE} = require("../../bento-event-logging/const/idp-constant");
const {ADMIN, ACTIVE} = require("../../bento-event-logging/const/user-constant");
const {errorName} = require("../../data-management/graphql-api-constants");
const {verifyToken, decodeToken, getAccessToken, authenticateUserToken} = require("../../services/tokenizer");

jest.mock("../../services/tokenizer");
jest.mock("../../data-management/neo4j-service");
const neo4jService = new Neo4jService();
const dataInterface = new DataInterface(neo4jService);

describe('arm service', () => {
    let myUser, context;

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
    });

    test('/create arm model', ()=> {
        const mockArms = [
            {armID: "request", accessStatus: PENDING},
            {armID: null, accessStatus: null},
            {armID: null, accessStatus: PENDING},
            {arm: null, access: PENDING},
            {armID: "approved1", accessStatus: APPROVED},
            {armID: "duplicateID", accessStatus: APPROVED},
            {armID: "duplicateID", accessStatus: APPROVED}
        ]
        // only valid arm access
        const armAccessArr = ArmAccess.createArmAccessArray(mockArms);
        const armIDs = getApprovedArmIDs(armAccessArr);
        expect(armIDs.length).toBe(2);
        // only unique ids needs to be stored
        expect(armIDs).toStrictEqual(["approved1", "duplicateID"]);
    });

    test('/list arms', async () => {
        const testArms = [{
            id: 'test',
            name: 'test'
        }];

        neo4jService.listArms.mockImplementation(() => {
            return testArms;
        });
        expect(await dataInterface.listArms("test params", context)).toStrictEqual(testArms);
    });

    test('/not logged listArms', async () => {
        const testArms = [{
            id: 'test',
            name: 'test'
        }];

        neo4jService.listArms.mockImplementation(() => {
            return testArms;
        });
        context.userInfo.IDP = null;
        context.userInfo.email = null;

        await expect(dataInterface.listArms("test params", context))
            .rejects
            .toThrow(errorName.NOT_LOGGED_IN);
    });

    test('/invalid token listArms', async () => {
        const testArms = [{
            id: 'test',
            name: 'test'
        }];

        neo4jService.listArms.mockImplementation(() => {
            return testArms;
        });

        verifyToken.mockImplementation(()=>{
            return true;
        })

        decodeToken.mockImplementation(()=>{
            return context.userInfo;
        });

        getAccessToken.mockImplementation(()=>{
            return 'test';
        });

        await expect(dataInterface.listArms("test params", context))
            .rejects
            .toThrow(errorName.NOT_VALID_TOKEN);
    });


    test('/valid token listArms', async () => {
        const testArms = [{
            id: 'test',
            name: 'test'
        }];

        neo4jService.listArms.mockImplementation(() => {
            return testArms;
        });

        verifyToken.mockImplementation(()=>{
            return true;
        })

        decodeToken.mockImplementation(()=>{
            return context.userInfo;
        });

        getAccessToken.mockImplementation(()=>{
            return 'test';
        });

        authenticateUserToken.mockImplementation(()=>{
           return true;
        });

        expect(await dataInterface.listArms("test params", context)).toStrictEqual(testArms);
    });

});