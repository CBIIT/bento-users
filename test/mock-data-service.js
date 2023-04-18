class MockDataService{

    constructor(responses) {
        if(!responses) responses = {};
        this.responses = responses;
        for (let key in responses){
            //store deep copy of objects instead of references
            responses[key] = typeof responses[key] === "object" ? JSON.parse(JSON.stringify(responses[key])) : responses[key]
        }
        this.eventsLog = [];
    }

    getResponse(key){
        let response = `Response has not been set for ${key}`;
        if(key in this.responses){
            response = this.responses[key];
        }
        return response;
    }

    registerUser(_){return this.getResponse("registerUser")}

    checkUnique(_){return this.getResponse("checkUnique")}

    getMyUser(_){return this.getResponse("getMyUser")}

    logEventNeo4j(event){
        this.eventsLog.push(event)
    }

}

module.exports = {
    MockDataService
}