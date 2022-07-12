const UserBuilder = require("../model/user");

describe('User Class Test', () => {
    const firstName = 'first';
    const lastName = 'lastName';
    const email = 'testtest@nih.gov';
    const idp = 'nih';

    test('/user create, null idp, null acp', () => {
        const user = UserBuilder.createUser(firstName, lastName, email, idp);
        expect(user.getFirstName()).toBe(firstName);
        expect(user.getLastName()).toBe(lastName);
        expect(user.getEmail()).toBe(email);
        expect(user.getIDP()).toBe(idp);
        expect(user.getACL()).toStrictEqual([]);
    });

    test('/user create', () => {

        const acl = ['a', 'b', 'c'];
        const role = 'standard';
        const organization = 'test-research';

        const user = new UserBuilder(firstName, lastName, email, idp)
            .setACL(acl)
            .setRole(role)
            .setOrganization(organization)
            .build();
        expect(user.getACL()).toStrictEqual(acl);
        expect(user.getOrganization()).toStrictEqual(organization);
        expect(user.getRole()).toStrictEqual(role);
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
        const user = UserBuilder.createUserFromSession(context.userInfo);
        expect(user.getUserInfo()).toBeTruthy();
    });

});