"use strict";
// IMPORTS 
// ================================================================================================
const errors_1 = require('./errors');
const util_1 = require('./util');
// FIELD
// ================================================================================================
class DbField {
    constructor(name, type, readonly, secret, cloner, comparator) {
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
                if (cloner)
                    throw new errors_1.ModelError('Cannot specify a cloner for Number, Boolean, or String field');
                if (comparator)
                    throw new errors_1.ModelError('Cannot specify a comparator for Number, Boolean, or String field');
                break;
            case Date:
                if (cloner)
                    throw new errors_1.ModelError('Cannot specify a custom cloner for Date field');
                if (comparator)
                    throw new errors_1.ModelError('Cannot specify a custom comparator for Date field');
                this.clone = util_1.cloneDate;
                this.areEqual = util_1.areDatesEqual;
                break;
            case Object:
                if (cloner && typeof cloner !== 'function')
                    throw new errors_1.ModelError('Object cloner must be a function');
                if (comparator && typeof comparator !== 'function')
                    throw new errors_1.ModelError('Object comparator must be a function');
                this.clone = cloner || util_1.cloneObject;
                this.areEqual = comparator || util_1.areObjectsEqual;
                break;
            case Array:
                if (cloner && typeof cloner !== 'function')
                    throw new errors_1.ModelError('Array cloner must be a function');
                if (comparator && typeof comparator !== 'function')
                    throw new errors_1.ModelError('Array comparator must be a function');
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
//# sourceMappingURL=schema.js.map