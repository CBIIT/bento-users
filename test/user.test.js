const {registerUser, getMyUser} = require("../data-management/data-interface");
const {sendRegistrationConfirmation, sendAdminNotification} = require("../data-management/notifications");
const {getAdminEmails, registerUser: registerUserService,getMyUser:getMyUserService, checkUnique} = require("../data-management/neo4j-service");
const {errorName} = require("../data-management/graphql-api-constants");


// Create Data management mock
jest.mock("../data-management/neo4j-service");
// // // Create email notification mock object
jest.mock("../data-management/notifications");

describe('arm access Test', () => {
    test('/register user test', async () => {
        getAdminEmails.mockReturnValue(Promise.resolve(["young.yoo@nih.gov"]))
        sendAdminNotification.mockReturnValue(Promise.resolve());
        sendRegistrationConfirmation.mockReturnValue(Promise.resolve());
        registerUserService.mockReturnValue(Promise.resolve({firstName: 'test', lastName: 'test'}));
        checkUnique.mockReturnValue(Promise.resolve(true));

        let parameters = {
            userInfo: {
                email: 'young.yoo@nih.gov',
                IDP: 'nih',
                userID: 9898,
                firstName: 'yyy',
                lastName: 'yoo',
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
                email: 'young.yoo@nih.gov',
                IDP: 'nih',
            }
        }
        await expect(registerUser(parameters)).rejects.toThrow(errorName.NOT_UNIQUE);
    });


    test('/geyMyUser NOT_LOGGED_IN', async () => {

        const fakeSession = {
            userInfo: {
                email: 'young.yoo@nih.gov',
                // idp: 'nih',
                userID: 9898,
                firstName: 'yyy',
                lastName: 'yoo',
                organization: '',
                acl: []
            }};

        await expect(getMyUser({}, fakeSession)).rejects.toThrow(errorName.NOT_LOGGED_IN);
    });

    test('/geyMyUser NOT_LOGGED_IN', async () => {

        const fakeSession = {
            userInfo: {
                email: 'young.yoo@nih.gov',
                // idp: 'nih',
                userID: 9898,
                firstName: 'yyy',
                lastName: 'yoo',
                organization: '',
                acl: []
            }};

        await expect(getMyUser({}, fakeSession)).rejects.toThrow(errorName.NOT_LOGGED_IN);
    });

    test('/geyMyUser Cause error', async () => {

        const fakeSession = {
            userInfo: {
                email: 'young.yoo@nih.gov',
                idp: 'nih',
                userID: 98989,
                firstName: 'yyy',
                lastName: 'yoo',
                organization: '',
                acl: []
            }};

        // await expect(getMyUser({}, fakeSession)).rejects.toThrow(errorName.NOT_LOGGED_IN);

        await getMyUser({}, fakeSession);
        await expect(registerUser).toBeCalledTimes(1)
    });


});