const {requestAccess:reqArmAccess} = require("../../data-management/data-interface");
const {updateMyUser:updateMyUserService,requestArmAccess: requestArmAccessService, getMyUser, getUser:getUserService,
    searchValidRequestArm
} = require("../../data-management/neo4j-service");
const {sendArmAccessNotification, sendAdminNotification} = require("../../data-management/notifications");
const {errorName} = require("../../data-management/graphql-api-constants");
const {REQUESTED} = require("../../constants/access-constant");
// Create Data management mock
jest.mock("../../data-management/neo4j-service");
// Create email notification mock object
jest.mock("../../data-management/notifications");


describe('arm access Test', () => {
    const mockUserName = {
        firstName: "tes",
        lastName: "test"
    };

    const mockAccessResult = {
        status: "requested",
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
        searchValidRequestArm.mockReturnValue(["arm"]);
        getMyUser.mockReturnValue(mockAccessResult);
        let parameters = {
            userID: 8,
            userInfo: {
                firstName: 'Young',
                lastName: 'Yoo',
                armIDs: ["arm"]
            }
        }
        let session = JSON.parse(JSON.stringify(fakeSession));
        session.userInfo.idp = 'random idp'
        await expect(reqArmAccess(parameters, session))
            .rejects
            .toThrow(errorName.INVALID_IDP);
    });


    test('/test arm request with missing input', async () => {
        let parameters = {
            userInfo: {
                firstName: 'Young',
                lastName: 'Yoo',
                // userId: 8,
                status: REQUESTED
            }
        }

        let session = JSON.parse(JSON.stringify(fakeSession));
        delete session.userInfo.email;
        await expect(reqArmAccess(parameters, session))
            .rejects
            .toThrow(errorName.NOT_LOGGED_IN);
    });


    test('/missing request arm input', async () => {
        let parameters = {
            userInfo: {
                // arm ids are required
                // armIDs: [1]
            }
        }
        await expect(reqArmAccess(parameters, fakeSession))
            .rejects
            .toThrow(errorName.MISSING_ARM_REQUEST_INPUTS);
    });

    test('/insert arm request', async () => {
        // TODO
        // sendArmAccessNotification.mockReturnValue(Promise.resolve());
        // sendAdminNotification.mockReturnValue(Promise.resolve());
        getMyUser.mockReturnValue(mockAccessResult);
        updateMyUserService.mockReturnValue(mockUserName);
        requestArmAccessService.mockReturnValue(Promise.resolve(mockAccessResult));
        getUserService.mockReturnValue(Promise.resolve(mockAccessResult));
        searchValidRequestArm.mockReturnValue([1]);
        let parameters = {
            userInfo: {
                firstName: 'Young',
                lastName: 'Yoo',
                armIDs: [1]
            }
        }
        // Return mock user
        expect(await reqArmAccess(parameters,fakeSession)).toBe(mockUserName);
        // TODO
        // setImmediate(() => {
        //     expect(sendArmAccessNotification).toBeCalledTimes(1);
        //     expect(sendAdminNotification).toBeCalledTimes(1);
        // });
    });

    test('/test optional firstname & lastname updateMyUserService', async () => {

        updateMyUserService.mockReturnValue(Promise.resolve(mockUserName));
        let parameters = {
            userInfo : {
                firstName: mockUserName.firstName,
                lastName: mockUserName.lastName
            }
        }
        const result = await updateMyUserService(parameters, fakeSession);
        expect(result).toBe(mockUserName);
    });

    // throw invalid arm access
    test('/throw invalid arm', async () => {
        searchValidRequestArm.mockReturnValue([]);
        getMyUser.mockReturnValue(mockAccessResult);
        let parameters = {
            userID: 8,
            userInfo: {
                firstName: 'Young',
                lastName: 'Yoo',
                armIDs: ["test1", "test2"]
            }
        }
        await expect(reqArmAccess(parameters, fakeSession))
            .rejects
            .toThrow(errorName.INVALID_REQUEST_ARM);
    });
});