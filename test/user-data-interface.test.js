const {registerUser, getMyUser} = require("../data-management/data-interface");
const {sendRegistrationConfirmation, sendAdminNotification} = require("../data-management/notifications");
const {getAdminEmails, registerUser: registerUserService,getMyUser:getMyUserService, checkUnique} = require("../data-management/neo4j-service");
const {errorName} = require("../data-management/graphql-api-constants");
// Create Data management mock
jest.mock("../data-management/neo4j-service");
// Create email notification mock object
jest.mock("../data-management/notifications");

describe('arm access Test', () => {
    const fakeSession = {
        userInfo: {
            email: 'testtest@nih.gov',
            idp: 'nih',
            firstName: 'test',
            lastName: 'test',
        }};

    test('/register user test', async () => {
        getAdminEmails.mockReturnValue(Promise.resolve(["test.test@nih.gov"]))
        sendAdminNotification.mockReturnValue(Promise.resolve());
        sendRegistrationConfirmation.mockReturnValue(Promise.resolve());
        registerUserService.mockReturnValue(Promise.resolve({firstName: 'test', lastName: 'test'}));
        checkUnique.mockReturnValue(Promise.resolve(true));

        let parameters = {
            userInfo: {
                email: 'testtest@nih.gov',
                idp: 'nih',
                userID: 9898,
                firstName: 'yyy',
                lastName: 'test',
                organization: '',
                acl: []
            }
        }
        await registerUser(parameters);

        expect(sendAdminNotification).toBeCalledTimes(1);
        expect(sendRegistrationConfirmation).toBeCalledTimes(1);

    });

    // check if unique user
    test('/registerUser throw not unique user', async () => {
        checkUnique.mockReturnValue(Promise.resolve(false));
        let parameters = {
            userInfo: {
                email: 'test.test@nih.gov',
                idp: 'nih',
            }
        }
        const result = await registerUser(parameters);
        expect(result.message).toBe(errorName.NOT_UNIQUE);
    });

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