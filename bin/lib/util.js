"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const crypto = require("crypto");
const pg_io_1 = require("pg-io");
const errors_1 = require("./errors");
// MODULE VARIABLES
// ================================================================================================
const camelPattern = /([A-Z]+)/g;
const KEY_LENGTH = 16;
const KEY_DIGEST = 'sha256';
const KEY_ITERATIONS = 100000;
const ENCRYPT_IV_LENGTH = 16;
const ENCRTYPT_ALGORITHM = 'aes-128-ctr';
// CASE CONVERTERS
// ================================================================================================
function camelToSnake(camel) {
    return camel.replace(camelPattern, (match) => '_' + match.toLowerCase());
}
exports.camelToSnake = camelToSnake;
// COMPARATORS
// ================================================================================================
function areObjectsEqual(valueA, valueB, parents) {
    if (valueA === valueB || (valueA !== valueA && valueB !== valueB))
        return true;
    if ((valueA === null || valueA === undefined) && (valueB === null || valueB === undefined))
        return true;
    if (!valueA || !valueB)
        return false;
    valueA = valueA.valueOf();
    valueB = valueB.valueOf();
    if (valueA === valueB || (valueA !== valueA && valueB !== valueB))
        return true;
    if ((valueA === null || valueA === undefined) && (valueB === null || valueB === undefined))
        return true;
    if (!valueA || !valueB)
        return false;
    switch (getType(valueA, valueB)) {
        case 1 /* primitive */:
        case 2 /* date */:
            return false;
        case 3 /* array */:
            return areArraysEqual(valueA, valueB, parents);
        case 4 /* object */:
            if (typeof valueA.isEqualTo === 'function')
                return valueA.isEqualTo(valueB);
            const keys = getKeys(valueA, valueB);
            if (!keys)
                return false;
            parents = parents ? parents : new WeakSet();
            parents.add(valueA);
            parents.add(valueB);
            let areEqual = true;
            for (let i = 0; i < keys.length; i++) {
                let valueAi = valueA[keys[i]];
                let valueBi = valueB[keys[i]];
                if (parents.has(valueAi) || parents.has(valueBi))
                    throw new errors_1.ModelError('Circular reference detected during object comparison');
                areEqual = areObjectsEqual(valueAi, valueBi, parents);
                if (!areEqual)
                    break;
            }
            parents.delete(valueA);
            parents.delete(valueB);
            return areEqual;
        default:
            return false;
    }
}
exports.areObjectsEqual = areObjectsEqual;
function areArraysEqual(array1, array2, parents) {
    if (array1 == array2)
        return true;
    if (array1 == undefined || array2 == undefined)
        return false;
    if (array1.length !== array2.length)
        return false;
    if (array1.length === 0)
        return true;
    for (let i = 0; i < array1.length; i++) {
        if (areObjectsEqual(array1[i], array2[i], parents) === false) {
            return false;
        }
    }
    return true;
}
exports.areArraysEqual = areArraysEqual;
function areSetsEqual(set1, set2, parents) {
    if (set1 == set2)
        return true;
    if (set1 == undefined || set2 == undefined)
        return false;
    if (set1.length != set2.length)
        return false;
    if (set1.length == 0)
        return true;
    for (let i = 0; i < set1.length; i++) {
        var found = false;
        for (let j = 0; j < set2.length; j++) {
            found = areObjectsEqual(set1[i], set2[j], parents);
            if (found)
                break;
        }
        if (!found)
            break;
    }
    return found;
}
exports.areSetsEqual = areSetsEqual;
function areDatesEqual(date1, date2) {
    if (date1 == date2)
        return true;
    if (date1 == undefined || date2 == undefined)
        return false;
    return (date1.valueOf() === date2.valueOf());
}
exports.areDatesEqual = areDatesEqual;
// CLONERS
// ================================================================================================
function cloneObject(source, parents) {
    if (source === undefined || source === null)
        return undefined;
    const type = getType(source, source);
    switch (type) {
        case 1 /* primitive */:
        case 2 /* date */:
            return source;
        case 3 /* array */:
            return cloneArray(source, parents);
        case 4 /* object */:
            if (typeof source.clone === 'function')
                return source.clone();
            if (source.constructor !== Object)
                throw new errors_1.ModelError(`Cannot clone object: no clone() method provided for a class`);
            parents = parents ? parents : new WeakSet();
            parents.add(source);
            const clone = {};
            for (let key in source) {
                const value = source[key];
                if (typeof value !== 'function') {
                    if (parents.has(value))
                        throw new errors_1.ModelError('Circular reference detected during object cloning');
                    clone[key] = cloneObject(value, parents);
                }
            }
            parents.delete(source);
            return clone;
        default:
            return undefined;
    }
}
exports.cloneObject = cloneObject;
function cloneArray(source, parents) {
    if (source == undefined)
        return undefined;
    if (source.length == 0)
        return [];
    const clone = [];
    for (let i = 0; i < source.length; i++) {
        clone.push(cloneObject(source[i], parents));
    }
    return clone;
}
exports.cloneArray = cloneArray;
function cloneDate(date) {
    if (!date)
        return;
    return new Date(date.valueOf());
}
exports.cloneDate = cloneDate;
// CRYPTO
// ================================================================================================
function secretToKey(secret) {
    if (!secret)
        throw new TypeError('Secret is undefined');
    return crypto.pbkdf2Sync(secret, pg_io_1.defaults.crypto.secretSalt, KEY_ITERATIONS, KEY_LENGTH, KEY_DIGEST);
}
exports.secretToKey = secretToKey;
function encrypt(plaintext, key) {
    if (!plaintext)
        return undefined;
    if (!key)
        throw new TypeError('Key is undefined');
    const iv = crypto.randomBytes(ENCRYPT_IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRTYPT_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([iv, cipher.update(plaintext, 'utf8'), cipher.final()]);
    return encrypted.toString('base64');
}
exports.encrypt = encrypt;
function decrypt(ciphertext, key) {
    if (!ciphertext)
        return undefined;
    if (!key)
        throw new TypeError('Key is undefined');
    const encrypted = Buffer.from(ciphertext, 'base64');
    const iv = Buffer.from(encrypted.slice(0, ENCRYPT_IV_LENGTH));
    const decipher = crypto.createDecipheriv(ENCRTYPT_ALGORITHM, key, iv);
    let plaintext = decipher.update(encrypted.slice(ENCRYPT_IV_LENGTH), 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
}
exports.decrypt = decrypt;
// HELPER FUNCTIONS
// ================================================================================================
function getKeys(objectA, objectB) {
    const keys = [];
    const keySet = new Set();
    for (let key in objectA) {
        if (typeof objectA[key] !== 'function') {
            keys.push(key);
            keySet.add(key);
        }
    }
    for (let key in objectB) {
        if (typeof objectB[key] !== 'function') {
            if (!keySet.has(key))
                return undefined;
        }
    }
    return keys;
}
function getType(valueA, valueB) {
    const typeA = typeof valueA;
    const typeB = typeof valueB;
    if (typeA !== typeB)
        return 0 /* na */;
    switch (typeA) {
        case 'number':
        case 'string':
        case 'boolean':
            return 1 /* primitive */;
        case 'object':
            if (valueA instanceof Date) {
                return (valueB instanceof Date) ? 2 /* date */ : 0 /* na */;
            }
            else if (valueA instanceof Array) {
                return (valueB instanceof Array) ? 3 /* array */ : 0 /* na */;
            }
            else
                return 4 /* object */;
        default:
            return 0 /* na */;
    }
}
//# sourceMappingURL=util.js.map