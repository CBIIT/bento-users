const {errorName} = require("../../data-management/graphql-api-constants");
const {authenticateUserToken} = require("../../services/tokenizer");
class TokenCondition {
    constructor(token, tokenSecret, uuidsArr) {
        this._token = token;
        this._tokenSecret =  tokenSecret;
        this._uuids = uuidsArr;
    }

    isValid() {
        return authenticateUserToken(this._token, this._tokenSecret, this._uuids);
    }

    throwError() {
        throw new Error(errorName.NOT_VALID_TOKEN);
    }
}

module.exports = TokenCondition