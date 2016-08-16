"use strict";
// IMPORTS 
// ================================================================================================
const errors_1 = require('./errors');
const util_1 = require('./util');
// FIELD
// ================================================================================================
class DbField {
    constructor(name, type, readonly, secret, handler) {
        // validate and set name
        if (typeof name !== 'string')
            throw new errors_1.ModelError('Database field name must be a string');
        this.name = name;
        // validate and set secret
        if (secret) {
            if (typeof secret !== 'string')
                throw new errors_1.ModelError('Database field secret must be a string');
            this.secret = secret;
        }
        // set readonly
        this.readonly = typeof readonly === 'boolean' ? readonly : false;
        // validate type and set coloner and comparator, when needed
        switch (type) {
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
        // set the type
        this.type = type;
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