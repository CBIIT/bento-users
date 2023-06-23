const {registerUser} = require("../data-management/data-interface");
const {sendRegistrationConfirmation, sendAdminNotification} = require("../data-management/notifications");
const {getAdminEmails, registerUser: registerUserService,getMyUser:getMyUserService, checkUnique} = require("../data-management/neo4j-service");
const {errorName} = require("../data-management/graphql-api-constants");
const jest = require("jest");
// Create Data management mock
jest.mock("../data-management/neo4j-service");
// Create email notification mock object
jest.mock("../data-management/notifications");

describe('register user API test', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const parameters = {
        userInfo: {
            email: 'testtest@nih.gov',
            idp: 'nih',
            firstName: 'yyy',
            lastName: 'test',
            organization: '',
            acl: []
        },
    }
    getAdminEmails.mockReturnValue(Promise.resolve(["test.test@nih.gov"]))
    sendAdminNotification.mockReturnValue(Promise.resolve());
    sendRegistrationConfirmation.mockReturnValue(Promise.resolve());
    registerUserService.mockReturnValue(Promise.resolve({firstName: 'test', lastName: 'test'}));
    checkUnique.mockReturnValue(Promise.resolve(true));

    test('/register without notification test', async () => {
        let params = JSON.parse(JSON.stringify(parameters));
        params.isNotify = false;
        await registerUser(params);

        setImmediate(()=>{
            expect(sendAdminNotification).toBeCalledTimes(0);
            expect(sendRegistrationConfirmation).toBeCalledTimes(0);

        });
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
        await expect(registerUser(parameters))
            .rejects
            .toThrow(errorName.NOT_UNIQUE);

    });

    // test('/register with notification test', async () => {
    //     await registerUser(parameters);
    //     setImmediate(()=>{
    //         expect(sendAdminNotification).toBeCalledTimes(1);
    //         expect(sendRegistrationConfirmation).toBeCalledTimes(1);
    //
    //     });
    // });
});