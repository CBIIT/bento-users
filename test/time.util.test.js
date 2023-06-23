
const {getTimeNow, addSeconds} = require("../util/time-util");
describe('Time Test', () => {
    test('/add time', () => {
        const currentTime = new Date(getTimeNow());
        // get time difference in seconds
        const getDifference = (target, after) => (after.getTime() - target.getTime()) / 1000;
        const add = (seconds) => {
            const addedTime = addSeconds(currentTime, seconds)
            return getDifference(currentTime, addedTime)
        }
        expect(add(10)).toBe(10);
        const test = [
            {src: add(10),result: 10},
            {src: add(60),result: 60},
            {src: add(0),result: 0},
        ];
        for (let t of test) {
            expect(t.src).toBe(t.result);
        }
    });
});