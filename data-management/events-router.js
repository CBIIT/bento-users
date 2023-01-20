const {downloadEvents} = require("./data-interface");
const express = require("express");
const router = express.Router();

router.get('/events', async function (req, res, next) {
    try{
        let path = await downloadEvents(req, res);
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

