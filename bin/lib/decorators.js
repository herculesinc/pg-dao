'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.dbModel = dbModel;
exports.dbField = dbField;

var _AbstractModel = require('./AbstractModel');

var _errors = require('./errors');

// DECORATOR DEFINITIONS
// ================================================================================================

function dbModel(table, idGenerator) {
    if (table === undefined || table === null || table.trim() === '') throw new _errors.ModelError('Model table name cannot be empty');
    return function (classConstructor) {
        classConstructor[_AbstractModel.symbols.dbTable] = table;
        classConstructor[_AbstractModel.symbols.dbSchema] = classConstructor.prototype[_AbstractModel.symbols.dbSchema];
        classConstructor[_AbstractModel.symbols.idGenerator] = idGenerator;
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
            throw new _errors.ModelError('Arrays types are not yet supported in model schemas');
        default:
            throw new _errors.ModelError(`Invalid field type in model schema`);
    }
    return function (classPrototype, property) {
        if (typeof property !== 'string') throw new _errors.ModelError('Database field property must be a string');
        var schema = classPrototype[_AbstractModel.symbols.dbSchema];
        if (schema === undefined) {
            schema = {};
            classPrototype[_AbstractModel.symbols.dbSchema] = schema;
        }
        schema[property] = fieldType;
    };
}
//# sourceMappingURL=../../bin/lib/decorators.js.map