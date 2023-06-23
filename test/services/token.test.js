const {createToken, verifyToken, timerLessThanInactiveDays} = require("../../services/tokenizer");

describe('tokenizer Test', () => {

    test('/token is not null', () => {
        const token = createToken({email: "bento@gmail.com"}, "X", 10);
        expect(token).not.toBeNull();
    });

    test('/verify token', () => {
        const token = createToken({}, "X", 10);
        const isValid = verifyToken(token, "X");
        expect(isValid).toBe(true);
    });

    test('/throw invalid token error', () => {
        const isValid = verifyToken("random", "X");
        expect(isValid).toBe(false);
    });

    test('/timerLessThanInactive', () => {
        const dayToSeconds = (day)=> day*24*60*60;
        const defaultTimeoutSeconds = 30*60;
        const tests = [
            {day: 1, timeout: null, expected: defaultTimeoutSeconds},
            {day: 1, timeout: 30, expected: 30},
            {day: 10, timeout: dayToSeconds(9), expected: dayToSeconds(9)},
            {day: null, timeout: dayToSeconds(9), expected: defaultTimeoutSeconds},
            {day: null, timeout: null, expected: defaultTimeoutSeconds}
        ];

        tests.forEach(t=> {
            const timeout = timerLessThanInactiveDays(t.day, t.timeout);
            expect(timeout).toBe(t.expected);
        });
    });
});