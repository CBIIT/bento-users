const {searchValidRequestArm, Neo4jService} = require("../../data-management/neo4j-service");
const {searchValidReqArms, DataInterface} = require("../../data-management/data-interface");
// Create Data management mock
jest.mock("../../data-management/neo4j-service");
// Create email notification mock object
jest.mock("../../data-management/notifications");

const neo4jService = new Neo4jService();
const dataInterface = new DataInterface(neo4jService);

describe('register user API test', () => {

    const mockAccessResult = [
        {armName: "a", armID: '1'},
        {armName: "b", armID: '2'}
    ]

    const fakeSession = {
        userInfo: {
            email: 'young.yoo@nih.gov',
            idp: 'nih',
            firstName: 'test',
            lastName: 'test',
        }};

    test('/request access', async () => {
        neo4jService.searchValidRequestArm.mockReturnValue(mockAccessResult);
        const result = await dataInterface.searchValidReqArms({armIDs: ["1", "2"]}, fakeSession);
        expect(result).toBe(mockAccessResult)
    });
});