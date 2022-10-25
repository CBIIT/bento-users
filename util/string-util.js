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

const isUndefined = (p) => {
    return p === undefined;
}

module.exports = {
    isCaseInsensitiveEqual,
    isElementInArray,
    isElementInArrayCaseInsensitive,
    isUndefined,
    getUniqueArr
}