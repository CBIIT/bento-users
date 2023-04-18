class UserService {

    constructor(dataService) {
        this.dataService = dataService;
    }

    async getAdmins() {
        const admins = await this.dataService.getAdmins();
        if (!admins || admins.length === 0)
            console.error("No admins found, please verify that at least one administrator user exists");
        return admins;
    }
}

module.exports = {
    UserService
}
