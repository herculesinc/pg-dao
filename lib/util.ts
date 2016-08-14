// IMPORTS
// ================================================================================================
import { ModelError } from './errors';

// MODULE VARIABLES
// ================================================================================================
const camelPattern = /([A-Z]+)/g;

// INTERFACES
// ================================================================================================
export type Cloner<T> = (value: T) => T;
export type Comparator = (value1: any, value2: any) => boolean;

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
export function areObjectsEqual(valueA: any, valueB: any, parents?: WeakSet<any>): boolean {
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
			return areArraysEqual(valueA, valueB, parents);
		case ValueType.object:
			if (typeof valueA.isEqualTo === 'function') return valueA.isEqualTo(valueB);

			const keys = getKeys(valueA, valueB);
			if (!keys) return false;
			
			parents = parents ? parents : new WeakSet<any>();
			parents.add(valueA);
			parents.add(valueB);
			
			let areEqual = true;
			for(let i = 0; i < keys.length; i++) {
				let valueAi = valueA[keys[i]];
				let valueBi = valueB[keys[i]];
				if (parents.has(valueAi) || parents.has(valueBi)) 
					throw new ModelError('Circular reference detected during object comparison');
				areEqual = areObjectsEqual(valueAi, valueBi , parents);
				if (!areEqual) break;
			}
			
			return areEqual;
		default:
			return false;
	}
}

export function areArraysEqual(array1: any[], array2: any[], parents?: WeakSet<any>): boolean {
    if (array1 == array2) return true;
    if (array1 == undefined || array2 == undefined) return false;
    if (array1.length !== array2.length) return false;
    if (array1.length === 0) return true;
    
    for (let i = 0; i < array1.length; i++) {
        if (areObjectsEqual(array1[i], array2[i], parents) === false) {
            return false;
        }
    }
    
    return true;
}

export function areSetsEqual(set1: any[], set2: any[], parents?: WeakSet<any>): boolean {
    if (set1 == set2) return true;
    if (set1 == undefined || set2 == undefined) return false;
    if (set1.length != set2.length) return false;
    if (set1.length == 0) return true;
    
    for (let i = 0; i < set1.length; i++) {
        var found = false;
        for (let j = 0; j < set2.length; j++) {
            found = areObjectsEqual(set1[i], set2[j], parents);
            if (found) break;
        }
        if (!found) break;
    }
    
    return found;
}

export function areDatesEqual(date1: Date, date2: Date): boolean {
	if (date1 == date2) return true;
	if (date1 == undefined || date2 == undefined) return false;
	return (date1.valueOf() === date2.valueOf());
}

// CLONERS
// ================================================================================================
export function cloneObject(source: any, parents?: WeakSet<any>): any {
	if (source === undefined || source === null) return undefined;
	const type = getType(source, source);
	
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
			
			const clone: any = {};
			for (let key in source) {
				const value = source[key];
				if (typeof value !== 'function') {
					if (parents.has(value))
						throw new ModelError('Circular reference detected during object cloning');
					clone[key] = cloneObject(value, parents);
				}
			}
			
			return clone;
		default:
			return undefined;
	}
}

export function cloneArray(source: any[], parents?: WeakSet<any>): any[] {
	if (source == undefined) return undefined;
    if (source.length == 0) return [];
	
	const clone = [];
	for (let i = 0; i < source.length; i++) {
		clone.push(cloneObject(source[i], parents));
	}
	return clone;
}

export function cloneDate(date: Date): Date {
	if (!date) return;
	return new Date(date.valueOf());
}

// HELPER FUNCTIONS
// ================================================================================================
function getKeys(objectA: any, objectB: any): string[] {
    const keys: string[] = [];
    const keySet = new Set<string>();
    
    for (let key in objectA) {
        if (typeof objectA[key] !== 'function') {
            keys.push(key);
            keySet.add(key);
        }
    }
    
    for (let key in objectB) {
		if (typeof objectB[key] !== 'function') {
            if (!keySet.has(key)) return undefined;
        }
	}
    
    return keys;
}

function getType(valueA: any, valueB: any): ValueType {
	const typeA = typeof valueA;
	const typeB = typeof valueB;
	
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