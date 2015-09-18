'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.dbModel = dbModel;
exports.dbField = dbField;

var _AbstractModel = require('./AbstractModel');

// DECORATOR DEFINITIONS
// ================================================================================================

function dbModel(table) {
    if (table === undefined || table === null || table.trim() === '') throw new Error('Model table name cannot be empty');
    return function (classConstructor) {
        classConstructor[_AbstractModel.symbols.dbTable] = table;
        classConstructor[_AbstractModel.symbols.dbSchema] = classConstructor.prototype[_AbstractModel.symbols.dbSchema];
    };
}

function dbField(fieldType) {
    switch (fieldType) {
        case Number:
        case String:
        case Date:
        case Object:
            break;
        case Array:
            throw new Error('Arrays types are not yet supported in model schemas');
        default:
            throw new Error(`Invalid field type in model schema`);
    }
    return function (classPrototype, property) {
        if (typeof property !== 'string') throw new Error('Database field property must be a string');
        var schema = classPrototype[_AbstractModel.symbols.dbSchema];
        if (schema === undefined) {
            schema = {};
            classPrototype[_AbstractModel.symbols.dbSchema] = schema;
        }
        schema[property] = fieldType;
    };
}
//# sourceMappingURL=../../bin/lib/decorators.js.map