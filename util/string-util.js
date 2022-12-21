function isCaseInsensitiveEqual(source, target) {
    if (!target || !source) return false;
    return source.toLowerCase() === target.toLowerCase();
}

function isElementInArray(array, target) {
    if (!array || !target) return false;
    return array.some((element) => element === target.toLowerCase());
}

function isElementInArrayCaseInsensitive(array, target) {
    if (!array || !target) return false;
    return array.some((element) => element.toLowerCase() === target.toLowerCase());
}

const getUniqueArr = (arr) => {return (arr) ? arr.filter((v, i, a) => a.indexOf(v) === i) : []};


// By default, empty splitter
// Convert an array to string separated string
const parseArrToStr = (arr, splitter) => {
    if (!arr) return "";
    const result = arr.filter((e)=> !isUndefined(e)).map((e)=> e);
    return result.join(splitter ? splitter : "");
}

const isUndefined = (p) => {
    return p === undefined;
}

module.exports = {
    isCaseInsensitiveEqual,
    isElementInArray,
    isElementInArrayCaseInsensitive,
    isUndefined,
    getUniqueArr,
    parseArrToStr
}