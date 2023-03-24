// tokenTimer must be less than inactive user timeout
const timerLessThanInactiveDays = (inactiveDays, tokenTimeout) => {
    // default timeout
    const defaultSecondTimeout = 30 * 60;
    const timeout = (tokenTimeout) ? tokenTimeout : defaultSecondTimeout;
    const dayToSeconds = (day) => day * 24 * 60 * 60;
    const inactiveUserTimeout = (inactiveDays) ? Math.min(dayToSeconds(inactiveDays), timeout) : defaultSecondTimeout;
    return Math.min(inactiveUserTimeout, timeout);
}

module.exports = {
    timerLessThanInactiveDays,
};