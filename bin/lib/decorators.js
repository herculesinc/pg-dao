"use strict";
// IMPORTS
// ================================================================================================
const AbstractModel_1 = require('./AbstractModel');
const errors_1 = require('./errors');
const schema_1 = require('./schema');
const util_1 = require('./util');
// DECORATOR DEFINITIONS
// ================================================================================================
function dbModel(table, idGenerator, arrayComparison) {
    if (table == undefined || table.trim() === '') throw new errors_1.ModelError('Model table name cannot be empty');
    if (!idGenerator) throw new errors_1.ModelError('Model ID generator cannot be empty');
    return function (classConstructor) {
        classConstructor[AbstractModel_1.symbols.dbTable] = table;
        var schemaMap = classConstructor.prototype[AbstractModel_1.symbols.dbSchema];
        classConstructor[AbstractModel_1.symbols.dbSchema] = Object.assign({}, schemaMap.get(AbstractModel_1.AbstractModel.name), schemaMap.get(classConstructor.name));
        classConstructor[AbstractModel_1.symbols.idGenerator] = idGenerator;
        classConstructor[AbstractModel_1.symbols.arrayComparator] = arrayComparison === 1 /* strict */
        ? util_1.compareArraysStrict : util_1.compareArraysAsSets;
    };
}
exports.dbModel = dbModel;
function dbField(fieldType, readonly) {
    return function (classPrototype, property) {
        var field = new schema_1.DbField(property, fieldType, readonly);
        var schemaMap = classPrototype[AbstractModel_1.symbols.dbSchema];
        if (schemaMap === undefined) {
            schemaMap = new Map();
            classPrototype[AbstractModel_1.symbols.dbSchema] = schemaMap;
        }
        var schema = schemaMap.get(classPrototype.constructor.name);
        if (schema === undefined) {
            schema = {};
            schemaMap.set(classPrototype.constructor.name, schema);
        }
        schema[property] = field;
    };
}
exports.dbField = dbField;
//# sourceMappingURL=decorators.js.map
