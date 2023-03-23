const neo4j = require("neo4j-driver");
const config = require("../config");

module.exports = {
    neo4jDriver: neo4j.driver(
        config.NEO4J_URI,
        neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
        {disableLosslessIntegers: true}
    )
}