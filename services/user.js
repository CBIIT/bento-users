const neo4j = require("../data-management/neo4j-service");

const getAdmins = async () => {
    const admins = await neo4j.getAdmins();
    if (!admins || admins.length == 0)
        console.error("No admins found, please verify that at least one administrator user exists");
    return admins;
}

module.exports = {
    getAdmins
}
