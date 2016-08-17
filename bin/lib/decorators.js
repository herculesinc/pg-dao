"use strict";
// IMPORTS 
// ================================================================================================
const AbstractModel_1 = require('./AbstractModel');
const errors_1 = require('./errors');
const schema_1 = require('./schema');
// DECORATOR DEFINITIONS
// ================================================================================================
function dbModel(table, idGenerator) {
    if (table == undefined || table.trim() === '')
        throw new errors_1.ModelError('Model table name cannot be empty');
    if (!idGenerator)
        throw new errors_1.ModelError('Model ID generator cannot be empty');
    return function (classConstructor) {
        const schemaMap = classConstructor.prototype[AbstractModel_1.symbols.dbFields];
        const fields = Object.assign({}, schemaMap.get(AbstractModel_1.AbstractModel.name), schemaMap.get(classConstructor.name));
        const fieldMap = new Map();
        const secretFieldMap = new Map();
        for (let fieldName in fields) {
            let field = fields[fieldName];
            fieldMap.set(fieldName, field);
            if (field.secret) {
                secretFieldMap.set(fieldName, field);
            }
        }
        classConstructor[AbstractModel_1.symbols.dbSchema] = {
            tableName: table,
            idGenerator: idGenerator,
            fields: fieldMap,
            secretFields: secretFieldMap
        };
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