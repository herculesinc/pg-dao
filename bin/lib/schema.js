"use strict";
const errors_1 = require('./errors');
const util_1 = require('./util');
// PUBLIC FUNCTIONS
// ================================================================================================
function buildModelSchema(table, idGenerator, fields) {
    // validate table name
    if (!table)
        throw new errors_1.ModelError('Cannot build model schema: table name is undefined');
    if (table.trim() === '')
        throw new errors_1.ModelError('Cannot build model schema: table name is invalid');
    // vlaidate ID Generator
    if (!idGenerator)
        throw new errors_1.ModelError('Cannot build model schema: ID Generator is undefined');
    if (typeof idGenerator.getNextId !== 'function')
        throw new errors_1.ModelError('Cannot build model schema: ID Generator is invalid');
    // validate and build filed maps
    if (!fields)
        throw new errors_1.ModelError('Cannot build model schema: fields are undefined');
    const fieldMap = new Map();
    const secretFieldMap = new Map();
    for (let fieldName in fields) {
        let config = fields[fieldName];
        if (!config)
            throw new errors_1.ModelError(`Cannot build model schema: definition for field '${fieldName}' is undefined`);
        let field = (config instanceof DbField)
            ? config
            : new DbField(fieldName, config.type, config.readonly, config.secret, config.handler);
        fieldMap.set(fieldName, field);
        if (field.secret) {
            secretFieldMap.set(fieldName, field);
        }
    }
    // build and return the schema
    return {
        tableName: table,
        idGenerator: idGenerator,
        fields: fieldMap,
        secretFields: secretFieldMap
    };
}
exports.buildModelSchema = buildModelSchema;
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
        // validate and set secret
        if (secret) {
            if (typeof secret !== 'string')
                throw new errors_1.ModelError('Database field secret must be a string');
            if (this.type !== String && this.type !== Object && this.type !== Array) {
                throw new errors_1.ModelError('Only string or JSON fields can be encrypted with a secret');
            }
            this.secret = secret;
        }
        // set readonly
        this.readonly = typeof readonly === 'boolean' ? readonly : false;
        // validate type and set coloner and comparator, when needed
        switch (this.type) {
            case Number:
            case Boolean:
            case String:
                if (handler)
                    throw new errors_1.ModelError('Cannot specify a field handler for Number, Boolean, or String field');
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