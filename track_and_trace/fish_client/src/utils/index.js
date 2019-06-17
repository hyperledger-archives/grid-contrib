/**
 * Copyright 2019 Bitwise IO, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ----------------------------------------------------------------------------
 */

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
