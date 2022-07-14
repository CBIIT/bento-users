const {isCaseInsensitiveEqual, isElementInArray} = require('../util/string-util')

describe('Util Test', () => {
    test('/string case insensitive equal', () => {
        const test = [
            {src: "nih", target: 'NIH',result: true},
            {src: "NIH", target: 'NiH',result: true},
            {src: "nih", target: 'Nih',result: true},
            {src: "nih", target: '',result: false},
            {src: "nih", target: null,result: false}
        ];

        for (let t of test) {
            const result = isCaseInsensitiveEqual(t.src, t.target);
            expect(result).toBe(t.result);
        }
    });

    test('/inspect any element in array', () => {
        const test = [
            {arr: [], target: 'idp',result: false},
            {arr: undefined, target: 'NiH',result: false},
            {arr: null, target: 'Nih',result: false},
            {arr: ['nih'], target: 'NIH',result: true},
            {arr: ['google', 'nih'], target: 'nIh',result: true}
        ];

        for (let t of test) {
            const result = isElementInArray(t.arr, t.target);
            expect(result).toBe(t.result);
        }
    });
});