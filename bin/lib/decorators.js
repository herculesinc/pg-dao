"use strict";
// IMPORTS 
// ================================================================================================
const AbstractModel_1 = require('./AbstractModel');
const errors_1 = require('./errors');
const schema_1 = require('./schema');
// DECORATOR DEFINITIONS
// ================================================================================================
function dbModel(table, idGenerator) {
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
    return function (classConstructor) {
        const schemaMap = classConstructor.prototype[AbstractModel_1.symbols.dbFields];
        const fields = Object.assign({}, schemaMap.get(AbstractModel_1.AbstractModel.name), schemaMap.get(classConstructor.name));
        classConstructor[AbstractModel_1.symbols.dbSchema] = new schema_1.DbSchema(table, idGenerator, fields);
    };
}
exports.dbModel = dbModel;
function dbField(fieldType, options) {
    // make sure options are set
    options = Object.assign({ readonly: false }, options);
    return function (classPrototype, property) {
        const field = new schema_1.DbField(property, fieldType, options.readonly, options.secret, options.handler);
        let schemaMap = classPrototype[AbstractModel_1.symbols.dbFields];
        if (!schemaMap) {
            schemaMap = new Map();
            classPrototype[AbstractModel_1.symbols.dbFields] = schemaMap;
        }
        let schema = schemaMap.get(classPrototype.constructor.name);
        if (!schema) {
            schema = {};
            schemaMap.set(classPrototype.constructor.name, schema);
        }
        schema[property] = field;
    };
}
exports.dbField = dbField;
//# sourceMappingURL=decorators.js.map