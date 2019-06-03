/**
 * Selects keys from an object
 */
const pluck = (obj, ...keys) => keys.reduce((o, k) => {
    if (typeof obj[k] !== 'undefined') {
        o[k] = obj[k]
    }

    return o
}, {})

/**
 * Merges objects, starting from left to right
 */
module.exports = {
    pluck,
}
