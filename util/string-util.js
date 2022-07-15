function isCaseInsensitiveEqual(source, target) {
    if (!target || !source) return false;
    if (source.toLowerCase() === target.toLowerCase()) return true;
}

function isElementInArray(array, target) {
    if (!array || !target) return false;
    return array.some((element) => element === target.toLowerCase());
}

module.exports = {
    isCaseInsensitiveEqual,
    isElementInArray
}