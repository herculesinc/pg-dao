"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS 
// ================================================================================================
const pg_io_1 = require("pg-io");
const types_1 = require("./types");
const errors_1 = require("./errors");
const util_1 = require("./util");
// SCHEMA
// ================================================================================================
class DbSchema {
    constructor(table, idGenerator, fields) {
        // validate and set table name
        if (!table)
            throw new errors_1.ModelError('Cannot build model schema: table name is undefined');
        if (table.trim() === '')
            throw new errors_1.ModelError('Cannot build model schema: table name is invalid');
        this.table = table;
        // vlaidate and set ID Generator
        if (!idGenerator)
            throw new errors_1.ModelError('Cannot build model schema: ID Generator is undefined');
        if (typeof idGenerator.getNextId !== 'function')
            throw new errors_1.ModelError('Cannot build model schema: ID Generator is invalid');
        this.idGenerator = idGenerator;
        // validate and set fields
        if (!fields)
            throw new errors_1.ModelError('Cannot build model schema: fields are undefined');
        this.fields = [];
        this.fieldMap = new Map();
        // set the ID field
        const idField = new DbField('id', String, true, undefined, undefined);
        this.fields.push(idField);
        this.fieldMap.set(idField.name, idField);
        // set createdOn and updatedOn field
        const createdOnField = new DbField('createdOn', types_1.Timestamp, true, undefined, undefined);
        this.fields.push(createdOnField);
        this.fieldMap.set(createdOnField.name, createdOnField);
        const updatedOnField = new DbField('updatedOn', types_1.Timestamp, false, undefined, undefined);
        this.fields.push(updatedOnField);
        this.fieldMap.set(updatedOnField.name, updatedOnField);
        // set all other model fields
        for (let fieldName in fields) {
            let config = fields[fieldName];
            if (!config)
                throw new errors_1.ModelError(`Cannot build model schema: definition for field '${fieldName}' is undefined`);
            let field = (config instanceof DbField)
                ? config
                : new DbField(fieldName, config.type, config.readonly, config.secret, config.handler);
            this.fields.push(field);
            this.fieldMap.set(field.name, field);
        }
    }
    hasField(fieldName) {
        return this.fieldMap.has(fieldName);
    }
    getField(fieldName) {
        return this.fieldMap.get(fieldName);
    }
}
exports.DbSchema = DbSchema;
// FIELD
// ================================================================================================
class DbField {
    constructor(name, type, readonly, secret, handler) {
        // set the type
        if (!type)
            throw new errors_1.ModelError('Database field type is undefined');
        this.type = type;
        // validate and set name
        if (typeof name !== 'string')
            throw new errors_1.ModelError('Database field name must be a string');
        this.name = name;
        this.snakeName = util_1.camelToSnake(this.name);
        // validate and set secret
        if (secret) {
            if (typeof secret !== 'string')
                throw new errors_1.ModelError('Database field secret must be a string');
            if (this.type !== String && this.type !== Object && this.type !== Array) {
                throw new errors_1.ModelError('Only string or JSON fields can be encrypted with a secret');
            }
            this.secretKey = pg_io_1.defaults.crypto.secretToKey(secret);
        }
        // set readonly
        this.readonly = typeof readonly === 'boolean' ? readonly : false;
        // validate type and set coloner and comparator, when needed
        switch (this.type) {
            case Number:
            case String:
            case types_1.Timestamp:
            case Boolean:
                if (handler)
                    throw new errors_1.ModelError('Cannot specify a field handler for Number, Boolean, Timestamp, or String field');
                break;
            case Date:
                if (handler)
                    throw new errors_1.ModelError('Cannot specify a custom field handler for Date field');
                this.clone = util_1.cloneDate;
                this.areEqual = util_1.areDatesEqual;
                break;
            case Object:
                var { cloner, comparator } = validateFieldHandler(handler);
                this.clone = cloner || util_1.cloneObject;
                this.areEqual = comparator || util_1.areObjectsEqual;
                break;
            case Array:
                var { cloner, comparator } = validateFieldHandler(handler);
                this.clone = cloner || util_1.cloneArray;
                this.areEqual = comparator || util_1.areArraysEqual;
                break;
            default:
                throw new errors_1.ModelError(`Invalid field type in model schema`);
        }
        // set getter and setter strings
        this.getter = this.snakeName === this.name ? this.name : `${this.snakeName} AS "${this.name}"`;
        this.setter = `${this.snakeName}={{${this.name}}}`;
    }
}
exports.DbField = DbField;
// HELPER FUNCTIONS
// ================================================================================================
function validateFieldHandler(handler) {
    if (!handler)
        return {};
    const cloner = handler.clone;
    if (!cloner)
        throw new errors_1.ModelError('Undefined cloner in field handler');
    if (typeof cloner !== 'function')
        throw new errors_1.ModelError('Invalid cloner in field handler');
    const comparator = handler.areEqual;
    if (!comparator)
        throw new errors_1.ModelError('Undefined comparator in field handler');
    if (typeof comparator !== 'function')
        throw new errors_1.ModelError('Invalid comparator in field handler');
    return { cloner, comparator };
}
//# sourceMappingURL=schema.js.map