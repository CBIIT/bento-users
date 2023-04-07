module.exports = {
    getTimeNow() {
        return (new Date()).toString();
    },
    // Adds seconds to a given time object
    addSeconds(date, seconds) {
        const time = new Date(date);
        // milliseconds to second
        return new Date(time.getTime() + seconds * 1000);
    },
    dateToEpochTimeStamp(timeStr) {
        return Date.parse(timeStr)
    }
}