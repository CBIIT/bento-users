const {searchValidRequestArm} = require("../../data-management/neo4j-service");
const {searchValidReqArms} = require("../../data-management/data-interface");
// Create Data management mock
jest.mock("../../data-management/neo4j-service");
// Create email notification mock object
jest.mock("../../data-management/notifications");
describe('register user API test', () => {

    const mockAccessResult = [
        {armName: "a", armID: '1'},
        {armName: "b", armID: '2'}
    ]

    const fakeSession = {
        userInfo: {
            email: 'bento.test@nih.gov',
            idp: 'nih',
            firstName: 'test',
            lastName: 'test',
        }};

    test('/request access', async () => {
        searchValidRequestArm.mockReturnValue(mockAccessResult);
        const result = await searchValidReqArms({armIDs: ["1", "2"]}, fakeSession);
        expect(result).toBe(mockAccessResult)
    });
});