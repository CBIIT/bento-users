const {updateUserName, requestAccess:reqArmAccess, searchArms} = require("../../data-management/data-interface");
const {updateUserName:updateUserNameService,requestArmAccess: requestArmAccessService, getMyUser, getUser:getUserService,
    searchArmsByListArm
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
        searchArmsByListArm.mockReturnValue(["arm"]);
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
                armIDs: [1]
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
        updateUserNameService.mockReturnValue(mockAccessResult);
        requestArmAccessService.mockReturnValue(Promise.resolve(mockAccessResult));
        getUserService.mockReturnValue(Promise.resolve(mockAccessResult));
        searchArmsByListArm.mockReturnValue([1]);
        let parameters = {
            userInfo: {
                firstName: 'Young',
                lastName: 'Yoo',
                armIDs: [1]
            }
        }

        const result = await reqArmAccess(parameters,fakeSession);
        expect(result).toBe(mockAccessResult);
        // TODO
        // setImmediate(() => {
        //     expect(sendArmAccessNotification).toBeCalledTimes(1);
        //     expect(sendAdminNotification).toBeCalledTimes(1);
        // });
    });

    test('/update user name', async () => {

        updateUserNameService.mockReturnValue(Promise.resolve(mockUserName));
        let parameters = {
            userInfo : {
                firstName: mockUserName.firstName,
                lastName: mockUserName.lastName,
                userID: 6
            }
        }
        const result = await updateUserName(parameters, fakeSession);
        expect(result).toBe(mockUserName);
    });


    test('/update user name & add request access', async () => {
        let parameters = {
            userInfo: {
                armIDs: [100],
                // name needs to send email
                firstName: 'Young',
                lastName: 'y',
            }
        }
        updateUserNameService.mockReturnValue(Promise.resolve(mockUserName));
        getMyUser.mockReturnValue(mockAccessResult);
        const updateUserNameResult = await updateUserName(parameters, fakeSession);
        expect(updateUserNameResult).toBe(mockUserName);

        requestArmAccessService.mockReturnValue(Promise.resolve(mockAccessResult));
        const resultAccessResult = await reqArmAccess(parameters, fakeSession);
        expect(resultAccessResult).toBe(mockAccessResult);
    });

    // throw invalid arm access
    test('/throw invalid arm', async () => {
        searchArmsByListArm.mockReturnValue([]);
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