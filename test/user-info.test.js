const UserBuilder = require("../model/user");
const {STANDARD, REQUESTED} = require("../constants/user-constant");

describe('User Class Test', () => {
    const firstName = 'first';
    const lastName = 'lastName';
    const email = 'testtest@nih.gov';
    const idp = 'nih';

    test('/user create, null idp, null acp', () => {
        const user = UserBuilder.createUserFromSession(firstName, lastName, email, idp);
        expect(user.getFirstName()).toBe(firstName);
        expect(user.getLastName()).toBe(lastName);
        expect(user.getEmail()).toBe(email);
        expect(user.getIDP()).toBe(idp);
        expect(user.getACL()).toStrictEqual([]);
    });

    test('/user create', () => {

        const acl = ['a', 'b', 'c'];
        const role = STANDARD;
        const status = REQUESTED;
        const organization = 'test-research';

        const user = new UserBuilder(firstName, lastName, email, idp)
            .setACL(acl)
            .setRole(role)
            .setStatus(status)
            .setOrganization(organization)
            .build();
        expect(user.getACL()).toStrictEqual(acl);
        expect(user.getOrganization()).toStrictEqual(organization);
        expect(user.getRole()).toStrictEqual(role);
        expect(user.getStatus()).toStrictEqual(status);
    });

    test('/create user from session', () => {
        const context = {
            userInfo: {
                firstName: 'first',
                lastName: 'lastName',
                email: 'testtest@nih.gov',
                idp: 'nih'
            }
        }
        const user = UserBuilder.createUser(context.userInfo);
        expect(user.getUserInfo()).toBeTruthy();
        expect(user.getUserInfo().firstName).toBe(context.userInfo.firstName);
    });

});