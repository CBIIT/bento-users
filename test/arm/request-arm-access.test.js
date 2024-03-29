const {DataInterface} = require("../../data-management/data-interface");
const {updateMyUser:updateMyUserService,requestArmAccess: requestArmAccessService, getMyUser, getUser:getUserService,
    searchValidRequestArm, getAdminEmails, Neo4jService
} = require("../../data-management/neo4j-service");
const {notifyUserArmAccessRequest, notifyAdminArmAccessRequest} = require("../../data-management/notifications");
const {errorName} = require("../../data-management/graphql-api-constants");
const {PENDING} = require("../../bento-event-logging/const/access-constant");
const {ADMIN, DISABLED, ACTIVE} = require("../../bento-event-logging/const/user-constant");
const {ArmReqUserStatusCondition} = require("../../model/valid-conditions/arm-conditions");
// Create Data management mock
jest.mock("../../data-management/neo4j-service");
// Create email notification mock object
jest.mock("../../data-management/notifications");

const neo4jService = new Neo4jService();
const dataInterface = new DataInterface(neo4jService);
describe('arm access Test', () => {
    const mockUserName = {
        firstName: "tes",
        lastName: "test"
    };

    const mockAccessResult = {
        status: PENDING,
        userID: 'xxxxx'
    }

    const fakeSession = {
        userInfo: {
            email: 'testtest@nih.gov',
            idp: 'nih',
            firstName: 'test',
            lastName: 'test',
        }};

    test('/test arm request with invalid idp', async () => {
        neo4jService.searchValidRequestArm.mockReturnValue(["arm"]);
        neo4jService.getMyUser.mockReturnValue(mockAccessResult);
        let parameters = {
            userID: 8,
            userInfo: {
                email: 'test@nih.gov',
                firstName: 'Young',
                lastName: 'Yoo',
                armIDs: ["arm"]
            }
        }
        let session = JSON.parse(JSON.stringify(fakeSession));
        session.userInfo.IDP = 'random idp'
        await expect(dataInterface.addArmRequestAccess(parameters, session))
            .rejects
            .toThrow(errorName.INVALID_IDP);
    });


    test('/test arm request with missing input', async () => {
        let parameters = {
            userInfo: {
                firstName: 'Young',
                lastName: 'Yoo',
                // userId: 8,
                status: PENDING
            }
        }

        let session = JSON.parse(JSON.stringify(fakeSession));
        delete session.userInfo.email;
        await expect(dataInterface.addArmRequestAccess(parameters, session))
            .rejects
            .toThrow(errorName.MISSING_INPUTS);
    });


    // test('/missing request arm input', async () => {
    //     let parameters = {
    //         userInfo: {
    //             // arm ids are required
    //             // armIDs: [1]
    //         }
    //     }
    //     let session = JSON.parse(JSON.stringify(fakeSession));
    //     session.userInfo.IDP = 'nih';
    //     await expect(dataInterface.addArmRequestAccess(parameters, fakeSession))
    //         .rejects
    //         .toThrow(errorName.MISSING_ARM_REQUEST_INPUTS);
    // });

    // test('/insert arm request', async () => {
    //     notifyUserArmAccessRequest.mockReturnValue(Promise.resolve());
    //     notifyAdminArmAccessRequest.mockReturnValue(Promise.resolve());
    //     getAdminEmails.mockReturnValue(Promise.resolve(['test@nih.gov']));
    //     getMyUser.mockReturnValue(mockAccessResult);
    //     updateMyUserService.mockReturnValue(mockUserName);
    //     requestArmAccessService.mockReturnValue(Promise.resolve(mockAccessResult));
    //     getUserService.mockReturnValue(Promise.resolve(mockAccessResult));
    //     searchValidRequestArm.mockReturnValue([1]);
    //     let parameters = {
    //         userInfo: {
    //             firstName: 'Young',
    //             lastName: 'Yoo',
    //             armIDs: [1]
    //         }
    //     }
    //     // Return mock user
    //     expect(await reqArmAccess(parameters,fakeSession)).toBe(mockUserName);
    //     expect(notifyUserArmAccessRequest).toBeCalledTimes(1);
    //     expect(notifyAdminArmAccessRequest).toBeCalledTimes(1);
    // });
    //
    // test('/test optional firstname & lastname updateMyUserService', async () => {
    //
    //     updateMyUserService.mockReturnValue(Promise.resolve(mockUserName));
    //     let parameters = {
    //         userInfo : {
    //             firstName: mockUserName.firstName,
    //             lastName: mockUserName.lastName
    //         }
    //     }
    //     const result = await updateMyUserService(parameters, fakeSession);
    //     expect(result).toBe(mockUserName);
    // });
    //
    // // throw invalid arm access
    // test('/throw invalid arm', async () => {
    //     searchValidRequestArm.mockReturnValue([]);
    //     getMyUser.mockReturnValue(mockAccessResult);
    //     let parameters = {
    //         userID: 8,
    //         userInfo: {
    //             firstName: 'Young',
    //             lastName: 'Yoo',
    //             armIDs: ["test1", "test2"]
    //         }
    //     }
    //     await expect(reqArmAccess(parameters, fakeSession))
    //         .rejects
    //         .toThrow(errorName.INVALID_REQUEST_ARM);
    // });
    //
    // // throw invalid arm access
    // test('/admin can not request arm access', async () => {
    //     notifyUserArmAccessRequest.mockReturnValue(Promise.resolve());
    //     notifyAdminArmAccessRequest.mockReturnValue(Promise.resolve());
    //     searchValidRequestArm.mockReturnValue([1]);
    //     let parameters = {
    //         userInfo: {
    //             firstName: 'Bento',
    //             lastName: 'test',
    //             armIDs: [1]
    //         }
    //     }
    //     let session = JSON.parse(JSON.stringify(fakeSession));
    //     session.userInfo.role = ADMIN;
    //     await expect(reqArmAccess(parameters, session))
    //         .rejects
    //         .toThrow(errorName.INVALID_ADMIN_ARM_REQUEST);
    //     expect(notifyUserArmAccessRequest).toBeCalledTimes(0);
    //     expect(notifyAdminArmAccessRequest).toBeCalledTimes(0);
    // });
    //
    // // throw invalid arm access
    // test('/disable user arm request', async () => {
    //     const tests = [
    //         {status: DISABLED, expected: false},
    //         {status: null, expected: false},
    //         {status: undefined, expected: false},
    //         {status: ACTIVE, expected: true},
    //         {status: "RANDOM", expected: false}
    //     ];
    //
    //     tests.forEach(t=> {
    //         const status = new ArmReqUserStatusCondition(t.status);
    //         expect(status.isValid()).toBe(t.expected);
    //     });
    // });
});