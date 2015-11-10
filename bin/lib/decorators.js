// IMPORTS
// ================================================================================================
'use strict';

var AbstractModel_1 = require('./AbstractModel');
var errors_1 = require('./errors');
// DECORATOR DEFINITIONS
// ================================================================================================
function dbModel(table, idGenerator) {
    if (table === undefined || table === null || table.trim() === '') throw new errors_1.ModelError('Model table name cannot be empty');
    return function (classConstructor) {
        classConstructor[AbstractModel_1.symbols.dbTable] = table;
        classConstructor[AbstractModel_1.symbols.dbSchema] = classConstructor.prototype[AbstractModel_1.symbols.dbSchema];
        classConstructor[AbstractModel_1.symbols.idGenerator] = idGenerator;
    };
}
exports.dbModel = dbModel;
function dbField(fieldType) {
    switch (fieldType) {
        case Number:
        case String:
        case Date:
        case Object:
            break;
        case Array:
            throw new errors_1.ModelError('Arrays types are not yet supported in model schemas');
        default:
            throw new errors_1.ModelError(`Invalid field type in model schema`);
    }
    return function (classPrototype, property) {
        if (typeof property !== 'string') throw new errors_1.ModelError('Database field property must be a string');
        var schema = classPrototype[AbstractModel_1.symbols.dbSchema];
        if (schema === undefined) {
            schema = {};
            classPrototype[AbstractModel_1.symbols.dbSchema] = schema;
        }
        schema[property] = fieldType;
    };
}
exports.dbField = dbField;
//# sourceMappingURL=decorators.js.map
