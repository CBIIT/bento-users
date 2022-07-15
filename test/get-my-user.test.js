const {registerUser, getMyUser} = require("../data-management/data-interface");
const {sendRegistrationConfirmation, sendAdminNotification} = require("../data-management/notifications");
const {registerUser: registerUserService,getMyUser:getMyUserService, checkUnique} = require("../data-management/neo4j-service");
const {errorName} = require("../data-management/graphql-api-constants");
// Create Data management mock
jest.mock("../data-management/neo4j-service");
// Create email notification mock object
jest.mock("../data-management/notifications");

describe('getMyUser API test', () => {
    const fakeSession = {
        userInfo: {
            email: 'testtest@nih.gov',
            idp: 'nih',
            firstName: 'test',
            lastName: 'test',
        }};

    test('/geyMyUser NOT_LOGGED_IN', async () => {
        let session = JSON.parse(JSON.stringify(fakeSession));
        delete session.userInfo.idp;
        const result = await getMyUser({}, session);
        expect(result.message).toBe(errorName.NOT_LOGGED_IN);
    });

    test('/geyMyUser throw error', async () => {
        const TEST_ERROR = 'TEST ERROR';
        getMyUserService.mockImplementation(() => {
            throw new Error(TEST_ERROR);
        });
        const result = await getMyUser({}, fakeSession);
        expect(result.message).toBe(TEST_ERROR);
    });

    test.concurrent('/register user after getMyUser', async () => {
        sendAdminNotification.mockReturnValue(Promise.resolve());
        sendRegistrationConfirmation.mockReturnValue(Promise.resolve());
        getMyUserService.mockReturnValue(Promise.resolve(undefined));
        registerUserService.mockReturnValue(Promise.resolve());
        checkUnique.mockReturnValue(Promise.resolve(true));

        await getMyUser({}, fakeSession);

        expect(registerUserService).toBeCalledTimes(1);
        expect(sendAdminNotification).toBeCalledTimes(0);
        expect(sendRegistrationConfirmation).toBeCalledTimes(0);
    });
});