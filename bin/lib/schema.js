"use strict";
// IMPORTS 
// ================================================================================================
const errors_1 = require('./errors');
// FIELD
// ================================================================================================
class DbField {
    constructor(name, type, readonly) {
        // validate and set name
        if (typeof name !== 'string')
            throw new errors_1.ModelError('Database field property must be a string');
        this.name = name;
        // validate and set type
        switch (type) {
            case Number:
            case Boolean:
            case String:
            case Date:
                this.type = type;
                // check if comparator was provided
                break;
            case Object:
                this.type = type;
                //this.comparator = something || deepCompare
                break;
            case Array:
                this.type = type;
                //this.comparator = compareArraysStrict;
                break;
            default:
                throw new errors_1.ModelError(`Invalid field type in model schema`);
        }
        // set readonly
        this.readonly = typeof readonly == 'boolean' ? readonly : false;
    }
}
exports.DbField = DbField;
//# sourceMappingURL=schema.js.map