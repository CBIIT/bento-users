const {DataInterface} = require("./data-interface");
const express = require("express");
const {Neo4jService} = require("./neo4j-service");
const {neo4jDriver} = require("./neo4j-driver");
const router = express.Router();

const dataInterface = new DataInterface(new Neo4jService(neo4jDriver));

router.get('/events', async function (req, res, next) {
    try{
        let path = await dataInterface.downloadEvents(req, res);
        let options = {
            root: require('path').resolve('./')
        };
        res.sendFile(path, options, (err) => {
            if (err){
                console.error(err);
                next();
            }
        });
    }
    catch(err){
        console.error(err);
        next(err);
    }
});

module.exports = router;

