const {updateMyUser} = require("../data-management/data-interface");
const {updateMyUser:updateMyUserService} = require("../data-management/neo4j-service");
const {errorName} = require("../data-management/graphql-api-constants");
// Create Data management mock
jest.mock("../data-management/neo4j-service");
// // Create email notification mock object
jest.mock("../data-management/notifications");

describe('getMyUser API test', () => {
    const fakeSession = {
        userInfo: {
            email: 'test.test@nih.gov',
            idp: 'nih',
            firstName: 'test',
            lastName: 'test',
        }};

    test('/updateMyUser not logged in without email', async () => {
        let session = JSON.parse(JSON.stringify(fakeSession));
        delete session.userInfo.email;

        await expect(updateMyUser({}, session))
            .rejects
            .toThrow(errorName.NOT_LOGGED_IN);
    });

    test('/updateMyUser execute query', async () => {
        let parameters = {
            userInfo: {
                firstName: 'teset',
                lastName: 'testtest',
                organization:  ''
            }
        }
        updateMyUserService.mockReturnValue(Promise.resolve());
        await updateMyUser(parameters, fakeSession);
        expect(updateMyUserService).toBeCalledTimes(1);
    });

    test('/updateMyUser execute query without user parameters', async () => {
        let parameters = {
            userInfo: {
                // firstName: 'teset',
                // lastName: 'testtest',
                // organization:  ''
            }
        }
        updateMyUserService.mockReturnValue(Promise.resolve());
        await updateMyUser(parameters, fakeSession);
        expect(updateMyUserService).toBeCalledTimes(1);
    });

});