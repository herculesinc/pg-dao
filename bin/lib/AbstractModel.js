"use strict";

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Model_1 = require('./Model');
var decorators_1 = require('./decorators');
var errors_1 = require('./errors');
var util_1 = require('./util');
// MODULE VARIABLES
// ================================================================================================
exports.symbols = {
    fetchQuery: Symbol(),
    updateQuery: Symbol(),
    insertQuery: Symbol(),
    deleteQuery: Symbol(),
    dbTable: Symbol(),
    dbSchema: Symbol(),
    idGenerator: Symbol()
};
// ABSTRACT MODEL CLASS DEFINITION
// ================================================================================================
class AbstractModel {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(seed) {
        if (!seed) throw new errors_1.ModelError('Cannot instantiate a model: model seed is undefined');
        if (!seed.id) throw new errors_1.ModelError('Cannot instantiate a model: model id is undefined');
        this.id = seed.id;
        this.createdOn = seed.createdOn;
        this.updatedOn = seed.updatedOn;
    }
    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row) {
        var model = new this(row);
        model[Model_1.symHandler] = this;
        return model;
    }
    static build(id, attributes) {
        if ('id' in attributes) throw new errors_1.ModelError('Cannot build a mode: model attributes contain id property');
        var model = new this(Object.assign({
            id: id,
            createdOn: new Date(),
            updatedOn: new Date()
        }, attributes));
        model[Model_1.symHandler] = this;
        return model;
    }
    static clone(model) {
        var clone = new this(model);
        clone[Model_1.symHandler] = this;
        return clone;
    }
    static infuse(target, source) {
        if (target == undefined || source == undefined) throw new errors_1.ModelError('Cannot infuse source into target: either source or target is undefined');
        if (target.constructor !== this || source.constructor !== this) throw new errors_1.ModelError('Cannot infuse source into target: either source or target have a wrong constructor');
        if (target.id !== source.id) throw new errors_1.ModelError('Cannot infuse source into target: source ID does not match target ID');
        var schema = this[exports.symbols.dbSchema];
        if (!schema) throw new errors_1.ModelError('Cannot infuse source into target: model schema is undefined');
        for (var field in schema) {
            switch (schema[field]) {
                case Number:
                case Boolean:
                case String:
                case Date:
                    target[field] = source[field];
                    break;
                case Object:
                    target[field] = cloneObject(source[field]);
                    break;
                case Array:
                    throw new errors_1.ModelError('Arrays types are not yet supported in model schemas');
                default:
                    throw new errors_1.ModelError(`Invalid field type in model schema`);
            }
        }
    }
    static areEqual(model1, model2) {
        if (model1 === undefined || model2 === undefined) return false;
        if (model1.constructor !== this || model2.constructor !== this) throw new errors_1.ModelError('Cannot compare models: model constructors do not match');
        var retval = true;
        var schema = this[exports.symbols.dbSchema];
        for (var field in schema) {
            switch (schema[field]) {
                case Number:
                case Boolean:
                case String:
                    retval = model1[field] === model2[field];
                    break;
                case Date:
                    retval = compareDates(model1[field], model2[field]);
                    break;
                case Object:
                    retval = compareObjects(model1[field], model2[field]);
                    break;
                case Array:
                    throw new errors_1.ModelError('Arrays types are not yet supported in model schemas');
                default:
                    throw new errors_1.ModelError(`Invalid field type in model schema`);
            }
            if (retval === false) break;
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
        } else if (original !== undefined && current === undefined) {
            let qDeleteModel = this[exports.symbols.deleteQuery];
            if (qDeleteModel === undefined) {
                qDeleteModel = buildDeleteQuery(this[exports.symbols.dbTable]);
                this[exports.symbols.deleteQuery] = qDeleteModel;
            }
            queries.push(new qDeleteModel(original));
        } else if (original !== undefined && current !== undefined) {
            let qUpdateModel = this[exports.symbols.updateQuery];
            if (qUpdateModel === undefined) {
                qUpdateModel = buildUpdateQuery(this[exports.symbols.dbTable], this[exports.symbols.dbSchema]);
                this[exports.symbols.updateQuery] = qUpdateModel;
            }
            queries.push(new qUpdateModel(current));
        }
        return queries;
    }
    static getFetchOneQuery(selector, forUpdate, name) {
        if (forUpdate === undefined) forUpdate = false;

        var qFetchQuery = this[exports.symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[exports.symbols.dbTable], this[exports.symbols.dbSchema], this);
            this[exports.symbols.fetchQuery] = qFetchQuery;
        }
        return new qFetchQuery(selector, 'object', name, forUpdate);
    }
    static getFetchAllQuery(selector, forUpdate, name) {
        if (forUpdate === undefined) forUpdate = false;

        var qFetchQuery = this[exports.symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[exports.symbols.dbTable], this[exports.symbols.dbSchema], this);
            this[exports.symbols.fetchQuery] = qFetchQuery;
        }
        return new qFetchQuery(selector, 'list', name, forUpdate);
    }
    static getIdGenerator() {
        return this[exports.symbols.idGenerator];
    }
}
__decorate([decorators_1.dbField(String)], AbstractModel.prototype, "id", void 0);
__decorate([decorators_1.dbField(Date)], AbstractModel.prototype, "createdOn", void 0);
__decorate([decorators_1.dbField(Date)], AbstractModel.prototype, "updatedOn", void 0);
exports.AbstractModel = AbstractModel;
// QUERY BUILDERS
// ================================================================================================
function buildFetchQuery(table, schema, handler) {
    if (table == undefined || table.trim() === '') throw new errors_1.ModelError('Cannot build a fetch query: model table is undefined');
    if (schema == undefined) throw new errors_1.ModelError('Cannot build a fetch query: model schema is undefined');
    var fields = [];
    for (var field in schema) {
        fields.push(`${ util_1.camelToSnake(field) } AS "${ field }"`);
    }
    var querySpec = `SELECT ${ fields.join(',') } FROM ${ table }`;
    return class {
        constructor(selector, mask, name, forUpdate) {
            var criteria = [];
            for (var filter in selector) {
                if (filter in schema === false) throw new errors_1.ModelQueryError('Cannot build a fetch query: model selector and schema are incompatible');
                if (selector[filter] && Array.isArray(selector[filter])) {
                    criteria.push(`${ util_1.camelToSnake(filter) } IN ({{${ filter }}})`);
                } else {
                    criteria.push(`${ util_1.camelToSnake(filter) }={{${ filter }}}`);
                }
            }
            this.name = name;
            this.text = querySpec + ` WHERE ${ criteria.join(' AND ') } ${ forUpdate ? 'FOR UPDATE' : '' };`;
            this.params = selector;
            this.mask = mask;
            this.mutable = forUpdate;
            this.handler = handler;
        }
    };
}
function buildInsertQuery(table, schema) {
    if (table == undefined || table.trim() === '') throw new errors_1.ModelError('Cannot build an insert query: model table is undefined');
    if (schema == undefined) throw new errors_1.ModelError('Cannot build an insert query: model schema is undefined');
    var fields = [];
    var params = [];
    for (var field in schema) {
        fields.push(util_1.camelToSnake(field));
        params.push(`{{${ field }}}`);
    }
    var querySpec = `INSERT INTO ${ table } (${ fields.join(',') }) VALUES (${ params.join(',') });`;
    return class {
        constructor(model) {
            this.text = querySpec;
            this.params = model;
        }
    };
}
function buildUpdateQuery(table, schema) {
    if (table == undefined || table.trim() === '') throw new errors_1.ModelError('Cannot build an update query: model table is undefined');
    if (schema == undefined) throw new errors_1.ModelError('Cannot build an update query: model schema is undefined');
    var fields = [];
    for (var field in schema) {
        if (field === 'id' || field === 'createdOn') continue;
        fields.push(`${ util_1.camelToSnake(field) }={{${ field }}}`);
    }
    var querySpec = `UPDATE ${ table } SET ${ fields.join(',') }`;
    return class {
        constructor(model) {
            this.text = querySpec + ` WHERE id = ${ model.id };`;
            this.params = model;
        }
    };
}
function buildDeleteQuery(table) {
    if (table == undefined || table.trim() === '') throw new errors_1.ModelError('Cannot build a delete query: model table is undefined');
    return class {
        constructor(model) {
            this.text = `DELETE FROM ${ table } WHERE id = ${ model.id };`;
        }
    };
}
// HELPER FUNCTIONS
// ================================================================================================
function compareDates(date1, date2) {
    if ((date1 === null || date1 === undefined) && (date2 === null || date2 === undefined)) return true;
    if (date1 === null || date1 === undefined || date2 === null || date2 === undefined) return false;
    return date1.valueOf() === date2.valueOf();
}
function compareObjects(object1, object2) {
    if ((object1 === null || object1 === undefined) && (object2 === null || object2 === undefined)) return true;
    if (object1 === null || object1 === undefined || object2 === null || object2 === undefined) return false;
    // TODO: make the comparison more intelligent
    return JSON.stringify(object1) === JSON.stringify(object2);
}
function cloneObject(source) {
    if (source === undefined || source === null) return undefined;
    // TODO: make cloning more intelligent
    return JSON.parse(JSON.stringify(source));
}
//# sourceMappingURL=AbstractModel.js.map
