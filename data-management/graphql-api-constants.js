const {PENDING, APPROVED, REJECTED, REVOKED} = require("../constants/access-constant");
const {MEMBER, NON_MEMBER, ADMIN} = require("../constants/user-constant");
exports.valid_idps = valid_idps = ["google", "nih", "login.gov", "test-idp"];
exports.user_roles = user_roles =['admin', 'member', 'non-member'];
exports.user_statuses = user_statuses = ['', 'inactive', 'active', 'disabled', 'deleted']; //null also accepted
exports.access_statuses = access_statuses = [PENDING, APPROVED, REJECTED, REVOKED];

exports.errorName = {
    INVALID_REVIEW_ARMS: "INVALID_REVIEW_ARMS",
    INVALID_REVOKE_ARMS: "INVALID_REVOKE_ARMS",
    MISSING_INPUTS: "MISSING_INPUTS",
    INVALID_IDP: "INVALID_IDP",
    NOT_LOGGED_IN: "NOT_LOGGED_IN",
    NOT_AUTHORIZED: "NOT_AUTHORIZED",
    NOT_APPROVED: 'NOT_APPROVED',
    NOT_UNIQUE: "NOT_UNIQUE",
    USER_NOT_FOUND: "USER_NOT_FOUND",
    ALREADY_APPROVED: "ALREADY_APPROVED",
    ALREADY_REJECTED: "ALREADY_REJECTED",
    INVALID_ROLE: "INVALID_ROLE",
    INVALID_STATUS: "INVALID_STATUS",
    UNABLE_TO_REGISTER_USER: 'UNABLE_TO_REGISTER_USER',
    UNABLE_TO_REQUEST_ARM_ACCESS: 'UNABLE_TO_REQUEST_ARM_ACCESS',
    INVALID_REQUEST_ARM: 'INVALID_REQUEST_ARM',
    MISSING_ARM_REQUEST_INPUTS: 'MISSING_ARM_REQUEST_INPUTS',
    NOT_GENERAL_USER: 'NON_GENERAL_USER',
    INVALID_ADMIN_ARM_REQUEST: 'INVALID_ADMIN_ARM_REQUEST',
};

exports.errorType = {
    INVALID_REVIEW_ARMS: {
        message: `The armIDs parameter contains arm IDs that have either not been requested by this user or have already been '${APPROVED}', '${REJECTED}', or '${REVOKED}'`,
        statusCode: 400
    },
    INVALID_REVOKE_ARMS: {
        message: `The armIDs parameter contains arm IDs that are not accessible to the specified user`,
        statusCode: 400
    },
    MISSING_INPUTS: {
        message: `Inputs for email and IDP are required inputs for registration`,
        statusCode: 400
    },
    MISSING_ARM_REQUEST_INPUTS: {
        message: `Arm id(s) is required input for arm request access`,
        statusCode: 400
    },
    INVALID_IDP: {
        message: "Invalid IDP, the valid IDPs are the following: " + valid_idps.join(", "),
        statusCode: 400
    },
    USER_NOT_FOUND: {
        message: `The specified user could not be found or does not exist`,
        statusCode: 400
    },
    INVALID_ROLE: {
        message: `The specified role is invalid, the user's role must be one of the following: '${user_roles.join(", ")}`,
        statusCode: 400
    },
    INVALID_STATUS: {
        message: `The specified status is invalid, the user's status must be one of the following: (empty string) '${user_statuses.join(", ")}'`,
        statusCode: 400
    },
    NOT_LOGGED_IN: {
        message: `User is either not logged in or not yet registered`,
        statusCode: 401
    },
    NOT_AUTHORIZED: {
        message: `Not authorized`,
        statusCode: 403
    },
    NOT_APPROVED: {
        message: `User has not been approved`,
        statusCode: 403
    },
    NOT_UNIQUE: {
        message: `The provided email and IDP combination is already registered`,
        statusCode: 409
    },
    ALREADY_APPROVED: {
        message: `The specified user has already been approved`,
        statusCode: 409
    },
    ALREADY_REJECTED: {
        message: `The specified user has already been rejected`,
        statusCode: 409
    },
    UNABLE_TO_REGISTER_USER: {
        message: `Something went wrong while registering the user`,
        statusCode: 409
    },
    UNABLE_TO_REQUEST_ARM_ACCESS: {
        message: `Something went wrong while requesting the arm access`,
        statusCode: 409
    },
    INVALID_REQUEST_ARM: {
        message: `The request arm does not exist or attempting to request an invalid arm`,
        statusCode: 409
    },
    NOT_GENERAL_USER: {
        message: `This user is neither '${MEMBER}' or '${NON_MEMBER}'`,
        statusCode: 409
    },
    INVALID_ADMIN_ARM_REQUEST: {
        message: `'${ADMIN}' is not allowed to request arm-access`,
        statusCode: 409
    }
};