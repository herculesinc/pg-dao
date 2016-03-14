"use strict";
// IMPORTS
// ================================================================================================
const errors_1 = require('./errors');
// MODULE VARIABLES
// ================================================================================================
var camelPattern = /([A-Z]+)/g;
// CASE CONVERTERS
// ================================================================================================
function camelToSnake(camel) {
    return camel.replace(camelPattern, match => '_' + match.toLowerCase());
}
exports.camelToSnake = camelToSnake;
// COMPARATORS
// ================================================================================================
function deepCompare(valueA, valueB, compareArrays, parents) {
    if (valueA === valueB || valueA !== valueA && valueB !== valueB) return true;
    if ((valueA === null || valueA === undefined) && (valueB === null || valueB === undefined)) return true;
    if (!valueA || !valueB) return false;
    valueA = valueA.valueOf();
    valueB = valueB.valueOf();
    if (valueA === valueB || valueA !== valueA && valueB !== valueB) return true;
    if ((valueA === null || valueA === undefined) && (valueB === null || valueB === undefined)) return true;
    if (!valueA || !valueB) return false;
    switch (getType(valueA, valueB)) {
        case 1 /* primitive */:
        case 2 /* date */:
            return false;
        case 3 /* array */:
            return compareArrays(valueA, valueB, parents);
        case 4 /* object */:
            if (typeof valueA.isEqualTo === 'function') return valueA.isEqualTo(valueB);
            var keys = getKeys(valueA, valueB);
            if (!keys) return false;
            parents = parents ? parents : new WeakSet();
            parents.add(valueA);
            parents.add(valueB);
            var areEqual = true;
            for (var i = 0; i < keys.length; i++) {
                var valueAi = valueA[keys[i]];
                var valueBi = valueB[keys[i]];
                if (parents.has(valueAi) || parents.has(valueBi)) throw new errors_1.ModelError('Circular reference detected during object comparison');
                areEqual = deepCompare(valueAi, valueBi, compareArrays, parents);
                if (!areEqual) break;
            }
            return areEqual;
        default:
            return false;
    }
}
exports.deepCompare = deepCompare;
function compareArraysStrict(array1, array2, parents) {
    if (array1 == array2) return true;
    if (array1 == undefined || array2 == undefined) return false;
    if (array1.length != array2.length) return false;
    if (array1.length === 0) return true;
    for (var i = 0; i < array1.length; i++) {
        if (deepCompare(array1[i], array2[i], compareArraysStrict, parents) === false) {
            return false;
        }
    }
    return true;
}
exports.compareArraysStrict = compareArraysStrict;
function compareArraysAsSets(array1, array2, parents) {
    if (array1 == array2) return true;
    if (array1 == undefined || array2 == undefined) return false;
    if (array1.length != array2.length) return false;
    if (array1.length == 0) return true;
    for (var i = 0; i < array1.length; i++) {
        var found = false;
        for (var j = 0; j < array2.length; j++) {
            found = deepCompare(array1[i], array2[j], compareArraysAsSets, parents);
            if (found) break;
        }
        if (!found) break;
    }
    return found;
}
exports.compareArraysAsSets = compareArraysAsSets;
// CLONERS
// ================================================================================================
function deepClone(source, parents) {
    if (source === undefined || source === null) return undefined;
    var type = getType(source, source);
    switch (type) {
        case 1 /* primitive */:
        case 2 /* date */:
            return source;
        case 3 /* array */:
            return cloneArray(source, parents);
        case 4 /* object */:
            if (typeof source.clone === 'function') return source.clone();
            if (source.constructor !== Object) throw new errors_1.ModelError(`Cannot clone object: no clone() method provided for a class`);
            parents = parents ? parents : new WeakSet();
            parents.add(source);
            var clone = {};
            for (var key in source) {
                var value = source[key];
                if (typeof value !== 'function') {
                    if (parents.has(value)) throw new errors_1.ModelError('Circular reference detected during object cloning');
                    clone[key] = deepClone(value, parents);
                }
            }
            return clone;
        default:
            return undefined;
    }
}
exports.deepClone = deepClone;
function cloneArray(source, parents) {
    if (source == undefined) return undefined;
    if (source.length == 0) return [];
    var clone = [];
    for (var i = 0; i < source.length; i++) {
        clone.push(deepClone(source[i], parents));
    }
    return clone;
}
// HELPER FUNCTIONS
// ================================================================================================
function getKeys(objectA, objectB) {
    var keys = [];
    var keySet = new Set();
    for (var key in objectA) {
        if (typeof objectA[key] !== 'function') {
            keys.push(key);
            keySet.add(key);
        }
    }
    for (var key in objectB) {
        if (typeof objectB[key] !== 'function') {
            if (!keySet.has(key)) return undefined;
        }
    }
    return keys;
}
function getType(valueA, valueB) {
    var typeA = typeof valueA;
    var typeB = typeof valueB;
    if (typeA !== typeB) return 0 /* na */;
    switch (typeA) {
        case 'number':
        case 'string':
        case 'boolean':
            return 1 /* primitive */;
        case 'object':
            if (valueA instanceof Date) {
                return valueB instanceof Date ? 2 /* date */ : 0 /* na */;
            } else if (valueA instanceof Array) {
                    return valueB instanceof Array ? 3 /* array */ : 0 /* na */;
                } else return 4 /* object */;
        default:
            return 0 /* na */;
    }
}
//# sourceMappingURL=util.js.map
