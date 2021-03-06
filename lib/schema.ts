// IMPORTS 
// ================================================================================================
import { defaults } from 'pg-io';
import { IdGenerator } from './Model';
import { Timestamp } from './types';
import { ModelError } from './errors';
import { 
	Cloner, cloneObject, cloneArray, cloneDate,
	Comparator, areObjectsEqual, areArraysEqual, areDatesEqual,
	camelToSnake
} from './util';

// INTERFACES
// ================================================================================================
export interface FieldHandler {
    clone       : Cloner<any>;
    areEqual    : Comparator;
}

export interface FieldMap {
	[name: string]: DbField | DbFieldConfig;
}

export interface DbFieldConfig {
	type		: any;
	readonly?	: boolean;
	secret?		: string;
	handler?	: FieldHandler;
}

// SCHEMA
// ================================================================================================
export class DbSchema {
	table		: string;
	idGenerator	: IdGenerator;
	fields		: DbField[];

	fieldMap	: Map<string, DbField>;

	constructor(table: string, idGenerator: IdGenerator, fields: FieldMap) {
		// validate and set table name
		if (!table) throw new ModelError('Cannot build model schema: table name is undefined');
		if (table.trim() === '') throw new ModelError('Cannot build model schema: table name is invalid');
		this.table = table;

		// vlaidate and set ID Generator
		if (!idGenerator) throw new ModelError('Cannot build model schema: ID Generator is undefined');
		if (typeof idGenerator.getNextId !== 'function')
			throw new ModelError('Cannot build model schema: ID Generator is invalid');
		this.idGenerator = idGenerator;

		// validate and set fields
		if (!fields) throw new ModelError('Cannot build model schema: fields are undefined');
		this.fields = [];
		this.fieldMap = new Map();

		// set the ID field
		const idField = new DbField('id', String, true, undefined, undefined);
		this.fields.push(idField);
		this.fieldMap.set(idField.name, idField);

		// set createdOn and updatedOn field
		const createdOnField = new DbField('createdOn', Timestamp, true, undefined, undefined);
		this.fields.push(createdOnField);
		this.fieldMap.set(createdOnField.name, createdOnField);

		const updatedOnField = new DbField('updatedOn', Timestamp, false, undefined, undefined);
		this.fields.push(updatedOnField);
		this.fieldMap.set(updatedOnField.name, updatedOnField);

		// set all other model fields
		for (let fieldName in fields) {
			let config = fields[fieldName];
			if (!config) throw new ModelError(`Cannot build model schema: definition for field '${fieldName}' is undefined`);
			let field = (config instanceof DbField)
				? config
				: new DbField(fieldName, config.type, config.readonly, config.secret, config.handler);

			this.fields.push(field);
			this.fieldMap.set(field.name, field);
		}

	}

	hasField(fieldName: string): boolean {
		return this.fieldMap.has(fieldName);
	}

	getField(fieldName: string): DbField {
		return this.fieldMap.get(fieldName);
	}
}

// FIELD
// ================================================================================================
export class DbField {
	name		: string;
	snakeName	: string;
	type		: any;
	readonly	: boolean;
	secretKey?	: Buffer;
	clone?		: Cloner<any>;
	areEqual?	: Comparator;
	setter		: string;
	getter		: string;

	constructor(name: string, type: any, readonly: boolean, secret: string, handler: FieldHandler) {

		// set the type
		if (!type) throw new ModelError('Database field type is undefined');
		this.type = type;

		// validate and set name
		if (typeof name !== 'string') throw new ModelError('Database field name must be a string');
		this.name = name;
		this.snakeName = camelToSnake(this.name);
		
		// validate and set secret
		if (secret) {
			if (typeof secret !== 'string')	throw new ModelError('Database field secret must be a string');
			if (this.type !== String && this.type !== Object && this.type !== Array) {
				throw new ModelError('Only string or JSON fields can be encrypted with a secret');
			}
			this.secretKey = defaults.crypto.secretToKey(secret);
		}
		
		// set readonly
		this.readonly = typeof readonly === 'boolean' ? readonly : false;

		// validate type and set coloner and comparator, when needed
    	switch (this.type) {
        	case Number: case String: case Timestamp: case Boolean:	
				if (handler)
					throw new ModelError('Cannot specify a field handler for Number, Boolean, Timestamp, or String field');
            	break;

			case Date:
				if (handler)
					throw new ModelError('Cannot specify a custom field handler for Date field');

				this.clone = cloneDate;
				this.areEqual = areDatesEqual;
				break;

			case Object:
				var { cloner, comparator } = validateFieldHandler(handler);
				this.clone = cloner || cloneObject;
				this.areEqual = comparator || areObjectsEqual;
				break;

			case Array:
				var { cloner, comparator } = validateFieldHandler(handler);
				this.clone = cloner || cloneArray;
				this.areEqual = comparator || areArraysEqual;
				break;

        	default:
            	throw new ModelError(`Invalid field type in model schema`);
    	}

		// set getter and setter strings
		this.getter = this.snakeName === this.name ? this.name : `${this.snakeName} AS "${this.name}"`;
		this.setter = `${this.snakeName}={{${this.name}}}`;
	}
}

// HELPER FUNCTIONS
// ================================================================================================
function validateFieldHandler(handler: FieldHandler): { cloner?: Cloner<any>, comparator?: Comparator} {
	if (!handler) return {};

	const cloner = handler.clone;
	if (!cloner) throw new ModelError('Undefined cloner in field handler');
	if (typeof cloner !== 'function') throw new ModelError('Invalid cloner in field handler');

	const comparator = handler.areEqual;
	if (!comparator) throw new ModelError('Undefined comparator in field handler');
	if (typeof comparator !== 'function') throw new ModelError('Invalid comparator in field handler');

	return { cloner, comparator };
}