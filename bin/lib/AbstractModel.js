"use strict";
const Model_1 = require("./Model");
const schema_1 = require("./schema");
const types_1 = require("./types");
const queries_1 = require("./queries");
const errors_1 = require("./errors");
const util_1 = require("./util");
// MODULE VARIABLES
// ================================================================================================
exports.symbols = {
    fetchQuery: Symbol(),
    updateQuery: Symbol(),
    insertQuery: Symbol(),
    deleteQuery: Symbol(),
    dbFields: Symbol(),
    dbSchema: Symbol(),
    selectorString: Symbol()
};
// ABSTRACT MODEL CLASS DEFINITION
// ================================================================================================
class AbstractModel {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(seed, deepCopy = false) {
        if (!seed)
            throw new errors_1.ModelError('Cannot instantiate a model: model seed is undefined');
        const schema = this.constructor[exports.symbols.dbSchema];
        if (Array.isArray(seed)) {
            // no cloning of fields needed, but must decrypt secret fields and parse timestamps
            for (let i = 0; i < schema.fields.length; i++) {
                let field = schema.fields[i];
                if (field.secret) {
                    // process encrypted field, can be only string, object, or array type
                    // TODO: implement lazy decrypting
                    this[field.name] = util_1.decryptField(seed[i], field.secret, field.type);
                }
                else if (field.type === types_1.Timestamp) {
                    // if this is a timestamp field, make sure it is converted to number
                    this[field.name] = types_1.Timestamp.parse(seed[i]);
                }
                else {
                    // otherwise, just copy the field value
                    this[field.name] = seed[i];
                }
            }
        }
        else if (deepCopy) {
            // use deep copy for object and array fields
            for (let field of schema.fields) {
                this[field.name] = (field.type === Object || field.type === Array || field.type === Date)
                    ? field.clone(seed[field.name])
                    : seed[field.name];
            }
        }
        else {
            // use shallow copy for all fields
            for (let field of schema.fields) {
                this[field.name] = seed[field.name];
            }
        }
        // set model handler
        this[Model_1.symHandler] = this.constructor;
    }
    // SCHEMA METHODS
    // --------------------------------------------------------------------------------------------
    static setSchema(tableName, idGenerator, fields) {
        this[exports.symbols.dbSchema] = new schema_1.DbSchema(tableName, idGenerator, fields);
    }
    static getFieldSelectors() {
        const schema = this[exports.symbols.dbSchema];
        const fieldSelectors = [];
        for (let field of schema.fields) {
            fieldSelectors.push(field.getter);
        }
        return fieldSelectors;
    }
    static getFieldSelectorString() {
        let selectors = this[exports.symbols.selectorString];
        if (!selectors) {
            selectors = this.getFieldSelectors().join(', ');
            this[exports.symbols.selectorString] = selectors;
        }
        return selectors;
    }
    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row) {
        if (!row)
            throw new errors_1.ModelError('Cannot parse model: model row is undefined');
        return new this(row);
    }
    static build(id, attributes) {
        if (!attributes)
            throw new errors_1.ModelError('Cannot build a mode: attributes are undefined');
        const timestamp = Date.now();
        const seed = Object.assign({
            id: id,
            createdOn: timestamp,
            updatedOn: timestamp
        }, attributes);
        return new this(seed, true);
    }
    static clone(model) {
        if (!model)
            throw new errors_1.ModelError('Cannot clone model: source model is undefined');
        if (model.constructor !== this)
            throw new errors_1.ModelError('Cannot clone model: source model has a wrong constructor');
        return new this(model, true);
    }
    static infuse(target, source) {
        if (target == undefined || source == undefined)
            throw new errors_1.ModelError('Cannot infuse source into target: either source or target is undefined');
        if (target.constructor !== this || source.constructor !== this)
            throw new errors_1.ModelError('Cannot infuse source into target: either source or target have a wrong constructor');
        if (target.id !== source.id)
            throw new errors_1.ModelError('Cannot infuse source into target: source ID does not match target ID');
        const schema = this[exports.symbols.dbSchema];
        if (!schema)
            throw new errors_1.ModelError('Cannot infuse source into target: model schema is undefined');
        for (let field of schema.fields) {
            if (field.readonly)
                continue;
            switch (field.type) {
                case Number:
                case String:
                case types_1.Timestamp:
                case Boolean:
                    target[field.name] = source[field.name];
                    break;
                case Date:
                case Object:
                case Array:
                    target[field.name] = field.clone(source[field.name]);
                    break;
                default:
                    throw new errors_1.ModelError('Cannot infuse source into target: field type is invalid');
            }
        }
    }
    static compare(original, current) {
        if (original == undefined || current == undefined)
            return undefined;
        if (original.constructor !== this || current.constructor !== this)
            throw new errors_1.ModelError('Cannot compare models: model constructors do not match');
        const changes = [];
        const schema = this[exports.symbols.dbSchema];
        for (let field of schema.fields) {
            if (field.readonly)
                continue;
            switch (field.type) {
                case Number:
                case String:
                case types_1.Timestamp:
                case Boolean:
                    if (original[field.name] != current[field.name]) {
                        changes.push(field.name);
                    }
                    break;
                case Date:
                case Object:
                case Array:
                    if (!field.areEqual(original[field.name], current[field.name])) {
                        changes.push(field.name);
                    }
                    break;
                default:
                    throw new errors_1.ModelError('Cannot compare models: field type is invalid');
            }
        }
        return changes;
    }
    static areEqual(model1, model2) {
        if (model1 == undefined && model2 == undefined)
            return true;
        if (model1 == undefined || model2 == undefined)
            return false;
        if (model1.constructor !== this || model2.constructor !== this)
            throw new errors_1.ModelError('Cannot compare models: model constructors do not match');
        const schema = this[exports.symbols.dbSchema];
        for (let field of schema.fields) {
            if (field.readonly)
                continue;
            switch (field.type) {
                case Number:
                case String:
                case types_1.Timestamp:
                case Boolean:
                    if (model1[field.name] != model2[field.name])
                        return false;
                    break;
                case Date:
                case Object:
                case Array:
                    if (!field.areEqual(model1[field.name], model2[field.name]))
                        return false;
                    break;
                default:
                    throw new errors_1.ModelError('Cannot compare models: field type is invalid');
            }
        }
        return true;
    }
    static getSyncQueries(original, current, changes) {
        const queries = [];
        const schema = this[exports.symbols.dbSchema];
        if (!original && current) {
            let qInsertModel = this[exports.symbols.insertQuery];
            if (!qInsertModel) {
                qInsertModel = buildInsertQuery(schema);
                this[exports.symbols.insertQuery] = qInsertModel;
            }
            queries.push(new qInsertModel(current));
        }
        else if (original && !current) {
            let qDeleteModel = this[exports.symbols.deleteQuery];
            if (!qDeleteModel) {
                qDeleteModel = buildDeleteQuery(schema.table);
                this[exports.symbols.deleteQuery] = qDeleteModel;
            }
            queries.push(new qDeleteModel(original));
        }
        else if (original && current) {
            let qUpdateModel = this[exports.symbols.updateQuery];
            if (!qUpdateModel) {
                qUpdateModel = buildUpdateQuery(schema);
                this[exports.symbols.updateQuery] = qUpdateModel;
            }
            queries.push(new qUpdateModel(current, changes));
        }
        return queries;
    }
    static getFetchOneQuery(selector, forUpdate = false, name) {
        let qFetchQuery = this[exports.symbols.fetchQuery];
        if (!qFetchQuery) {
            qFetchQuery = buildFetchQuery(this[exports.symbols.dbSchema], this);
            this[exports.symbols.fetchQuery] = qFetchQuery;
        }
        name = name || `qFetchOne${this.name}Model`;
        return new qFetchQuery(selector, 'object', name, forUpdate);
    }
    static getFetchAllQuery(selector, forUpdate = false, name) {
        let qFetchQuery = this[exports.symbols.fetchQuery];
        if (!qFetchQuery) {
            qFetchQuery = buildFetchQuery(this[exports.symbols.dbSchema], this);
            this[exports.symbols.fetchQuery] = qFetchQuery;
        }
        name = name || `qFetchAll${this.name}Models`;
        return new qFetchQuery(selector, 'list', name, forUpdate);
    }
    static getIdGenerator() {
        const schema = this[exports.symbols.dbSchema];
        return schema.idGenerator;
    }
}
exports.AbstractModel = AbstractModel;
// QUERY BUILDERS
// ================================================================================================
function buildFetchQuery(schema, handler) {
    if (!schema)
        throw new errors_1.ModelError('Cannot build a fetch query: model schema is undefined');
    const fieldGetters = [];
    for (let field of schema.fields) {
        fieldGetters.push(field.getter);
    }
    const querySpec = `SELECT ${fieldGetters.join(',')} FROM ${schema.table}`;
    return class extends queries_1.AbstractModelQuery {
        constructor(selector, mask, name, forUpdate) {
            super(handler, mask, forUpdate);
            const criteria = [];
            for (let filter in selector) {
                let field = schema.getField(filter);
                if (!field) {
                    throw new errors_1.ModelQueryError('Cannot build a fetch query: model selector and schema are incompatible');
                }
                if (selector[filter] && Array.isArray(selector[filter])) {
                    criteria.push(`${field.snakeName} IN ([[${filter}]])`);
                }
                else {
                    criteria.push(`${field.snakeName}={{${filter}}}`);
                }
            }
            this.name = name;
            this.text = querySpec + ` WHERE ${criteria.join(' AND ')} ${forUpdate ? 'FOR UPDATE' : ''};`;
            this.params = selector;
        }
    };
}
function buildInsertQuery(schema) {
    if (!schema)
        throw new errors_1.ModelError('Cannot build an insert query: model schema is undefined');
    const fields = [];
    const params = [];
    const secretFields = [];
    for (let field of schema.fields) {
        fields.push(field.snakeName);
        params.push(`{{${field.name}}}`);
        if (field.secret) {
            secretFields.push(field);
        }
    }
    const queryText = `INSERT INTO ${schema.table} (${fields.join(',')}) VALUES (${params.join(',')});`;
    return class extends queries_1.AbstractActionQuery {
        constructor(model) {
            super(`qInsert${model[Model_1.symHandler].name}Model`, model);
            this.text = queryText;
            if (secretFields.length) {
                const encryptedFields = {};
                for (let field of secretFields) {
                    encryptedFields[field.name] = util_1.encryptField(model[field.name], field.secret);
                }
                this.params = Object.assign({}, model, encryptedFields);
            }
        }
    };
}
function buildUpdateQuery(schema) {
    if (!schema)
        throw new errors_1.ModelError('Cannot build an update query: model schema is undefined');
    const queryBase = `UPDATE ${schema.table} SET `;
    return class extends queries_1.AbstractActionQuery {
        constructor(model, changes) {
            super(`qUpdate${model[Model_1.symHandler].name}Model`, model);
            let hasEncryptedFields = false;
            const encryptedFields = {};
            const fieldSetters = [];
            for (let changedField of changes) {
                let field = schema.getField(changedField);
                if (!field)
                    throw new errors_1.ModelQueryError(`Cannot create model query: field '${changedField}' cannot be updated`);
                fieldSetters.push(field.setter);
                if (field.secret) {
                    hasEncryptedFields = true;
                    encryptedFields[field.name] = util_1.encryptField(model[field.name], field.secret);
                }
            }
            this.text = queryBase + `${fieldSetters.join(',')} WHERE id = '${model.id}';`;
            if (hasEncryptedFields) {
                this.params = Object.assign({}, model, encryptedFields);
            }
        }
    };
}
function buildDeleteQuery(table) {
    if (table == undefined || table.trim() === '')
        throw new errors_1.ModelError('Cannot build a delete query: model table is undefined');
    return class extends queries_1.AbstractActionQuery {
        constructor(model) {
            super(`qDelete${model[Model_1.symHandler].name}Model`);
            this.text = `DELETE FROM ${table} WHERE id = '${model.id}';`;
        }
    };
}
//# sourceMappingURL=AbstractModel.js.map