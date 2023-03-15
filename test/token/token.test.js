const {getAccessToken, verifyToken} = require("../../services/tokenizer");

describe('tokenizer Test', () => {
    test('/testing access token', () => {
        expect(Boolean(getAccessToken({authorization: "random"}))).toBe(false);
        expect(Boolean(getAccessToken({authorization: "Bearer testtesttest"}))).toBe(true);
        expect(Boolean(getAccessToken({authorization: "Bearer"}))).toBe(false);
        expect(Boolean(getAccessToken({xxx: "Bearer"}))).toBe(false);
        expect(Boolean(getAccessToken(null))).toBe(false);
        expect(Boolean(getAccessToken(undefined))).toBe(false);
        expect(Boolean(getAccessToken({authorization: "bearer"}))).toBe(false);
    });

    test('/testing verifying Token', async () => {
        expect(verifyToken(null)).toBe(false);
        expect(verifyToken(undefined)).toBe(false);
        expect(verifyToken("")).toBe(false);
        expect(verifyToken("Token")).toBe(false);
    });
});