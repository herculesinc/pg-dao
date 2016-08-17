"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const Model_1 = require('./Model');
const decorators_1 = require('./decorators');
const queries_1 = require('./queries');
const errors_1 = require('./errors');
const util_1 = require('./util');
// MODULE VARIABLES
// ================================================================================================
exports.symbols = {
    fetchQuery: Symbol(),
    updateQuery: Symbol(),
    insertQuery: Symbol(),
    deleteQuery: Symbol(),
    dbFields: Symbol(),
    dbSchema: Symbol()
};
// ABSTRACT MODEL CLASS DEFINITION
// ================================================================================================
class AbstractModel {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(seed) {
        if (!seed)
            throw new errors_1.ModelError('Cannot instantiate a model: model seed is undefined');
        if (!seed.id)
            throw new errors_1.ModelError('Cannot instantiate a model: model id is undefined');
        this.id = seed.id;
        if (!seed.createdOn) {
            let timestamp = new Date();
            this.createdOn = timestamp;
            this.updatedOn = timestamp;
        }
        else {
            this.createdOn = seed.createdOn instanceof Date
                ? seed.createdOn : new Date(seed.createdOn);
            this.updatedOn = seed.updatedOn instanceof Date
                ? seed.updatedOn : new Date(seed.updatedOn);
        }
        // set model handler
        this[Model_1.symHandler] = this.constructor;
    }
    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row) {
        const schema = this[exports.symbols.dbSchema];
        if (!schema)
            throw new errors_1.ModelError('Cannot parse model: model schema is undefined');
        if (schema.secretFields.size) {
            const encryptedFields = {};
            for (let field of schema.secretFields.values()) {
                encryptedFields[field.name] = util_1.decryptField(row[field.name], field.secret, field.type);
            }
            row = Object.assign({}, row, encryptedFields);
        }
        return new this(row);
    }
    static build(id, attributes) {
        if (attributes.id)
            throw new errors_1.ModelError('Cannot build a mode: model attributes contain id property');
        return new this(Object.assign({ id: id }, attributes));
    }
    static clone(model) {
        if (model == undefined)
            throw new errors_1.ModelError('Cannot clone model: source model is undefined');
        if (model.constructor !== this)
            throw new errors_1.ModelError('Cannot clone model: source model has a wrong constructor');
        const schema = this[exports.symbols.dbSchema];
        if (!schema)
            throw new errors_1.ModelError('Cannot clone model: model schema is undefined');
        const seed = {};
        for (let field of schema.fields.values()) {
            switch (field.type) {
                case Number:
                case Boolean:
                case String:
                    seed[field.name] = model[field.name];
                    break;
                case Date:
                case Object:
                case Array:
                    seed[field.name] = field.clone(model[field.name]);
                    break;
                default:
                    throw new errors_1.ModelError('Cannot clone model: field type is invalid');
            }
        }
        return new this(seed);
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
        for (let field of schema.fields.values()) {
            if (field.readonly)
                continue;
            switch (field.type) {
                case Number:
                case Boolean:
                case String:
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
        for (let field of schema.fields.values()) {
            if (field.readonly)
                continue;
            switch (field.type) {
                case Number:
                case Boolean:
                case String:
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
        for (let field of schema.fields.values()) {
            if (field.readonly)
                continue;
            switch (field.type) {
                case Number:
                case Boolean:
                case String:
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
                qDeleteModel = buildDeleteQuery(schema.tableName);
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
__decorate([
    decorators_1.dbField(String, { readonly: true })
], AbstractModel.prototype, "id", void 0);
__decorate([
    decorators_1.dbField(Date, { readonly: true })
], AbstractModel.prototype, "createdOn", void 0);
__decorate([
    decorators_1.dbField(Date)
], AbstractModel.prototype, "updatedOn", void 0);
exports.AbstractModel = AbstractModel;
// QUERY BUILDERS
// ================================================================================================
function buildFetchQuery(schema, handler) {
    if (!schema)
        throw new errors_1.ModelError('Cannot build a fetch query: model schema is undefined');
    const fields = [];
    for (let field of schema.fields.values()) {
        fields.push(`${util_1.camelToSnake(field.name)} AS "${field.name}"`);
    }
    const querySpec = `SELECT ${fields.join(',')} FROM ${schema.tableName}`;
    return class extends queries_1.AbstractModelQuery {
        constructor(selector, mask, name, forUpdate) {
            super(handler, mask, forUpdate);
            const criteria = [];
            for (let filter in selector) {
                if (!schema.fields.has(filter)) {
                    throw new errors_1.ModelQueryError('Cannot build a fetch query: model selector and schema are incompatible');
                }
                if (selector[filter] && Array.isArray(selector[filter])) {
                    criteria.push(`${util_1.camelToSnake(filter)} IN ([[${filter}]])`);
                }
                else {
                    criteria.push(`${util_1.camelToSnake(filter)}={{${filter}}}`);
                }
            }
            this.name = name;
            this.text = querySpec + ` WHERE ${criteria.join(' AND ')} ${forUpdate ? 'FOR UPDATE' : ''};`;
            this.params = selector;
        }
    }
    ;
}
function buildInsertQuery(schema) {
    if (!schema)
        throw new errors_1.ModelError('Cannot build an insert query: model schema is undefined');
    const fields = [];
    const params = [];
    for (let field of schema.fields.values()) {
        fields.push(util_1.camelToSnake(field.name));
        params.push(`{{${field.name}}}`);
    }
    const queryText = `INSERT INTO ${schema.tableName} (${fields.join(',')}) VALUES (${params.join(',')});`;
    return class extends queries_1.AbstractActionQuery {
        constructor(model) {
            super(`qInsert${model[Model_1.symHandler].name}Model`, model);
            this.text = queryText;
            if (schema.secretFields.size) {
                const encryptedFields = {};
                for (let field of schema.secretFields.values()) {
                    encryptedFields[field.name] = util_1.encryptField(model[field.name], field.secret);
                }
                this.params = Object.assign({}, model, encryptedFields);
            }
        }
    }
    ;
}
function buildUpdateQuery(schema) {
    if (!schema)
        throw new errors_1.ModelError('Cannot build an update query: model schema is undefined');
    const fieldMap = new Map();
    for (let field of schema.fields.values()) {
        if (field.readonly)
            continue;
        fieldMap.set(field.name, {
            name: field.name,
            setter: `${util_1.camelToSnake(field.name)}={{${field.name}}}`,
            secret: field.secret
        });
    }
    const queryBase = `UPDATE ${schema.tableName} SET `;
    return class extends queries_1.AbstractActionQuery {
        constructor(model, changes) {
            super(`qUpdate${model[Model_1.symHandler].name}Model`, model);
            let hasEncryptedFields = false;
            const encryptedFields = {};
            const fieldSetters = [];
            for (let changedField of changes) {
                let field = fieldMap.get(changedField);
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
    }
    ;
}
function buildDeleteQuery(table) {
    if (table == undefined || table.trim() === '')
        throw new errors_1.ModelError('Cannot build a delete query: model table is undefined');
    return class extends queries_1.AbstractActionQuery {
        constructor(model) {
            super(`qDelete${model[Model_1.symHandler].name}Model`);
            this.text = `DELETE FROM ${table} WHERE id = '${model.id}';`;
        }
    }
    ;
}
//# sourceMappingURL=AbstractModel.js.map