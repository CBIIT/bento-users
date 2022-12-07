const neo4j = require("neo4j-driver");
const config = require("../config");
const {DatabaseDriver} = require("./database-driver");
class BentoUserDriver extends DatabaseDriver {
    constructor() {
        const driver = neo4j.driver(
            config.NEO4J_URI,
            neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
            {disableLosslessIntegers: true}
        );
        super(driver);
    }
}

module.exports = {
    BentoUserDriver
};