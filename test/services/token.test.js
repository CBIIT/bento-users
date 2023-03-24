const {timerLessThanInactiveDays} = require("../../services/tokenizer");

describe('tokenizer Test', () => {
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