// IMPORTS
// ================================================================================================
import { ModelError } from './errors';

// MODULE VARIABLES
// ================================================================================================
var camelPattern = /([A-Z]+)/g;

// INTERFACES
// ================================================================================================
export interface ArrayComparator {
    (array1: any[], array2: any, parents?: WeakSet<any>): boolean;
}

const enum ValueType {
	na, primitive, date, array, object
}

// CASE CONVERTERS
// ================================================================================================
export function camelToSnake(camel: string) {
	return camel.replace(camelPattern, (match) => '_' + match.toLowerCase());
}

// COMPARATORS
// ================================================================================================
export function deepCompare(valueA: any, valueB: any, compareArrays: ArrayComparator, parents?: WeakSet<any>): boolean {
    if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) return true;
	if ((valueA === null || valueA === undefined) && (valueB === null || valueB === undefined)) return true;
    if (!valueA || !valueB) return false;
    
    valueA = valueA.valueOf();
    valueB = valueB.valueOf();
    if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) return true;
	if ((valueA === null || valueA === undefined) && (valueB === null || valueB === undefined)) return true;
    if (!valueA || !valueB) return false;
    
	switch (getType(valueA, valueB)) {
		case ValueType.primitive: case ValueType.date:
			return false;
		case ValueType.array:
			return compareArrays(valueA, valueB, parents);
		case ValueType.object:
			if (typeof valueA.isEqualTo === 'function') return valueA.isEqualTo(valueB);

			var keys = getKeys(valueA, valueB);
			if (!keys) return false;
			
			parents = parents ? parents : new WeakSet<any>();
			parents.add(valueA);
			parents.add(valueB);
			
			var areEqual = true;
			for(var i = 0; i < keys.length; i++) {
				var valueAi = valueA[keys[i]];
				var valueBi = valueB[keys[i]];
				if (parents.has(valueAi) || parents.has(valueBi)) 
					throw new ModelError('Circular reference detected during object comparison');
				areEqual = deepCompare(valueAi, valueBi , compareArrays, parents);
				if (!areEqual) break;
			}
			
			return areEqual;
		default:
			return false;
	}
}

export function compareArraysStrict(array1: any[], array2: any[], parents?: WeakSet<any>): boolean {
    if (array1 == array2) return true;
    if (array1 == undefined || array2 == undefined) return false;
    if (array1.length !== array2.length) return false;
    if (array1.length === 0) return true;
    
    for (let i = 0; i < array1.length; i++) {
        if (deepCompare(array1[i], array2[i], compareArraysStrict, parents) === false) {
            return false;
        }
    }
    
    return true;
}

export function compareArraysAsSets(array1: any[], array2: any[], parents?: WeakSet<any>): boolean {
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

// CLONERS
// ================================================================================================
export function deepClone(source: any, parents?: WeakSet<any>): any {
	if (source === undefined || source === null) return undefined;
	var type = getType(source, source);
	
	switch (type) {
		case ValueType.primitive: case ValueType.date:
			return source;
		case ValueType.array:
			return cloneArray(source, parents);
		case ValueType.object:
			if (typeof source.clone === 'function') return source.clone();
			if (source.constructor !== Object)
				throw new ModelError(`Cannot clone object: no clone() method provided for a class`);

			parents = parents ? parents : new WeakSet<any>();
			parents.add(source);
			
			var clone: any = {};
			for (var key in source) {
				var value = source[key];
				if (typeof value !== 'function') {
					if (parents.has(value))
						throw new ModelError('Circular reference detected during object cloning');
					clone[key] = deepClone(value, parents);
				}
			}
			
			return clone;
		default:
			return undefined;
	}
}

function cloneArray(source: any[], parents?: WeakSet<any>): any[] {
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
function getKeys(objectA: any, objectB: any): string[] {
    var keys: string[] = [];
    var keySet = new Set<string>();
    
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

function getType(valueA: any, valueB: any): ValueType {
	var typeA = typeof valueA;
	var typeB = typeof valueB;
	
	if (typeA !== typeB) return ValueType.na;
	
	switch (typeA) {
		case 'number': case 'string': case 'boolean':
			return ValueType.primitive;
		case 'object':
			if (valueA instanceof Date) {
				return (valueB instanceof Date) ? ValueType.date : ValueType.na;
			}
			else if (valueA instanceof Array) {
				return (valueB instanceof Array) ? ValueType.array : ValueType.na;
			}
			else return ValueType.object;
		default:
			return ValueType.na;
	}
}