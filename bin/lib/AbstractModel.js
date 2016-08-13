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
    dbTable: Symbol(),
    dbSchema: Symbol(),
    idGenerator: Symbol(),
    arrayComparator: Symbol()
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
    }
    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row) {
        var model = new this(row);
        model[Model_1.symHandler] = this;
        return model;
    }
    static build(id, attributes) {
        if ('id' in attributes)
            throw new errors_1.ModelError('Cannot build a mode: model attributes contain id property');
        var timestamp = new Date();
        var model = new this(Object.assign({
            id: id,
            createdOn: timestamp,
            updatedOn: timestamp
        }, attributes));
        model[Model_1.symHandler] = this;
        return model;
    }
    static clone(model) {
        if (model == undefined)
            throw new errors_1.ModelError('Cannot clone model: source model is undefined');
        if (model.constructor !== this)
            throw new errors_1.ModelError('Cannot clone model: source model has a wrong constructor');
        var schema = this[exports.symbols.dbSchema];
        if (!schema)
            throw new errors_1.ModelError('Cannot clone model: model schema is undefined');
        // TODO: find a better mechanism for cloning models
        var seed = {};
        for (var fieldName in schema) {
            var field = schema[fieldName];
            seed[field.name] = util_1.deepClone(model[field.name]);
        }
        var clone = new this(seed);
        clone[Model_1.symHandler] = this;
        return clone;
    }
    static infuse(target, source) {
        if (target == undefined || source == undefined)
            throw new errors_1.ModelError('Cannot infuse source into target: either source or target is undefined');
        if (target.constructor !== this || source.constructor !== this)
            throw new errors_1.ModelError('Cannot infuse source into target: either source or target have a wrong constructor');
        if (target.id !== source.id)
            throw new errors_1.ModelError('Cannot infuse source into target: source ID does not match target ID');
        var schema = this[exports.symbols.dbSchema];
        if (!schema)
            throw new errors_1.ModelError('Cannot infuse source into target: model schema is undefined');
        for (var fieldName in schema) {
            var field = schema[fieldName];
            if (field.readonly)
                continue;
            target[field.name] = util_1.deepClone(source[field.name]);
        }
    }
    static areEqual(model1, model2) {
        if (model1 == undefined || model2 == undefined)
            return false;
        if (model1.constructor !== this || model2.constructor !== this)
            throw new errors_1.ModelError('Cannot compare models: model constructors do not match');
        var retval = true;
        var schema = this[exports.symbols.dbSchema];
        var arrayComparator = this[exports.symbols.arrayComparator];
        for (var fieldName in schema) {
            var field = schema[fieldName];
            retval = util_1.deepCompare(model1[field.name], model2[field.name], arrayComparator);
            if (retval === false)
                break;
        }
        return retval;
    }
    static getSyncQueries(original, current) {
        var queries = [];
        if (original === undefined && current !== undefined) {
            let qInsertModel = this[exports.symbols.insertQuery];
            if (qInsertModel === undefined) {
                qInsertModel = buildInsertQuery(this[exports.symbols.dbTable], this[exports.symbols.dbSchema]);
                this[exports.symbols.insertQuery] = qInsertModel;
            }
            queries.push(new qInsertModel(current));
        }
        else if (original !== undefined && current === undefined) {
            let qDeleteModel = this[exports.symbols.deleteQuery];
            if (qDeleteModel === undefined) {
                qDeleteModel = buildDeleteQuery(this[exports.symbols.dbTable]);
                this[exports.symbols.deleteQuery] = qDeleteModel;
            }
            queries.push(new qDeleteModel(original));
        }
        else if (original !== undefined && current !== undefined) {
            // TODO: only update fields that have change - structural changes required
            let qUpdateModel = this[exports.symbols.updateQuery];
            if (qUpdateModel === undefined) {
                qUpdateModel = buildUpdateQuery(this[exports.symbols.dbTable], this[exports.symbols.dbSchema]);
                this[exports.symbols.updateQuery] = qUpdateModel;
            }
            queries.push(new qUpdateModel(current));
        }
        return queries;
    }
    static getFetchOneQuery(selector, forUpdate = false, name) {
        var qFetchQuery = this[exports.symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[exports.symbols.dbTable], this[exports.symbols.dbSchema], this);
            this[exports.symbols.fetchQuery] = qFetchQuery;
        }
        name = name || `qFetchOne${this.name}Model`;
        return new qFetchQuery(selector, 'object', name, forUpdate);
    }
    static getFetchAllQuery(selector, forUpdate = false, name) {
        var qFetchQuery = this[exports.symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[exports.symbols.dbTable], this[exports.symbols.dbSchema], this);
            this[exports.symbols.fetchQuery] = qFetchQuery;
        }
        name = name || `qFetchAll${this.name}Models`;
        return new qFetchQuery(selector, 'list', name, forUpdate);
    }
    static getIdGenerator() {
        return this[exports.symbols.idGenerator];
    }
}
__decorate([
    decorators_1.dbField(String, true)
], AbstractModel.prototype, "id", void 0);
__decorate([
    decorators_1.dbField(Date, true)
], AbstractModel.prototype, "createdOn", void 0);
__decorate([
    decorators_1.dbField(Date)
], AbstractModel.prototype, "updatedOn", void 0);
exports.AbstractModel = AbstractModel;
// QUERY BUILDERS
// ================================================================================================
function buildFetchQuery(table, schema, handler) {
    if (table == undefined || table.trim() === '')
        throw new errors_1.ModelError('Cannot build a fetch query: model table is undefined');
    if (schema == undefined)
        throw new errors_1.ModelError('Cannot build a fetch query: model schema is undefined');
    var fields = [];
    for (var fieldName in schema) {
        var field = schema[fieldName];
        fields.push(`${util_1.camelToSnake(field.name)} AS "${field.name}"`);
    }
    var querySpec = `SELECT ${fields.join(',')} FROM ${table}`;
    return class extends queries_1.AbstractModelQuery {
        constructor(selector, mask, name, forUpdate) {
            super(handler, mask, forUpdate);
            var criteria = [];
            for (var filter in selector) {
                if (filter in schema === false)
                    throw new errors_1.ModelQueryError('Cannot build a fetch query: model selector and schema are incompatible');
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
function buildInsertQuery(table, schema) {
    if (table == undefined || table.trim() === '')
        throw new errors_1.ModelError('Cannot build an insert query: model table is undefined');
    if (schema == undefined)
        throw new errors_1.ModelError('Cannot build an insert query: model schema is undefined');
    var fields = [];
    var params = [];
    for (var fieldName in schema) {
        var field = schema[fieldName];
        fields.push(util_1.camelToSnake(field.name));
        params.push(`{{${field.name}}}`);
    }
    var querySpec = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${params.join(',')});`;
    return class extends queries_1.AbstractActionQuery {
        constructor(model) {
            super(`qInsert${model[Model_1.symHandler].name}Model`, model);
            this.text = querySpec;
        }
    }
    ;
}
function buildUpdateQuery(table, schema) {
    if (table == undefined || table.trim() === '')
        throw new errors_1.ModelError('Cannot build an update query: model table is undefined');
    if (schema == undefined)
        throw new errors_1.ModelError('Cannot build an update query: model schema is undefined');
    var fields = [];
    for (var fieldName in schema) {
        var field = schema[fieldName];
        if (field.readonly)
            continue;
        fields.push(`${util_1.camelToSnake(field.name)}={{${field.name}}}`);
    }
    var querySpec = `UPDATE ${table} SET ${fields.join(',')}`;
    return class extends queries_1.AbstractActionQuery {
        constructor(model) {
            super(`qUpdate${model[Model_1.symHandler].name}Model`, model);
            this.text = querySpec + ` WHERE id = '${model.id}';`;
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