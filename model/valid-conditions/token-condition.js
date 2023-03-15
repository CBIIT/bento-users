const {errorName} = require("../../data-management/graphql-api-constants");
const {verifyToken} = require("../../services/tokenizer");
class TokenCondition {
    constructor(token) {
        this._token = token;
    }

    isValid() {
        return verifyToken(this._token);
    }

    throwError() {
        throw new Error(errorName.NOT_VALID_TOKEN);
    }
}

module.exports = TokenCondition