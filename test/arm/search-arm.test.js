const {searchArmsByListArm} = require("../../data-management/neo4j-service");
const {searchArms} = require("../../data-management/data-interface");
// Create Data management mock
jest.mock("../../data-management/neo4j-service");
// Create email notification mock object
jest.mock("../../data-management/notifications");
describe('register user API test', () => {

    const mockAccessResult = [
        {armName: "a", armID: '1'},
        {armName: "b", armID: '2'}
    ]

    test('/request access', async () => {
        searchArmsByListArm.mockReturnValue(mockAccessResult);
        const result = await searchArms({armIDs: ["1", "2"]});
        expect(result).toBe(mockAccessResult)
    });

    test('/unique', async ()=> {

        const requestArms = ['1','2','2'].filter((v, i, a) => a.indexOf(v) === i);
        console.log();
    })
});