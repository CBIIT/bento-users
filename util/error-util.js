const {errorType} = require("../data-management/graphql-api-constants");

const formatErrorResponse = (res, error) => {
    let status;
    let body = {error: undefined};
    try {
        status = errorType[error.message].statusCode;
        body.error = errorType[error.message].message;
    } catch (err) {
        status = 500;
        body.error = "Internal server error: "+error;
    }
    res.status(status);
    return body;
}

module.exports = {
    formatErrorResponse
}