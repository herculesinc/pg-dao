"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Model = require('./Model');

var _decorators = require('./decorators');

var _errors = require('./errors');

var _util = require('./util');

// MODULE VARIABLES
// ================================================================================================
var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2:
            return decorators.reduceRight(function (o, d) {
                return d && d(o) || o;
            }, target);
        case 3:
            return decorators.reduceRight(function (o, d) {
                return (d && d(target, key), void 0);
            }, void 0);
        case 4:
            return decorators.reduceRight(function (o, d) {
                return d && d(target, key, o) || o;
            }, desc);
    }
};
var symbols = {
    fetchQuery: Symbol(),
    updateQuery: Symbol(),
    insertQuery: Symbol(),
    deleteQuery: Symbol(),
    dbTable: Symbol(),
    dbSchema: Symbol()
};
exports.symbols = symbols;
// ABSTRACT MODEL CLASS DEFINITION
// ================================================================================================

class AbstractModel {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(seed) {
        if (!seed) throw new _errors.ModelError('Cannot instantiate a model: model seed is undefined');
        this.id = seed.id;
        this.createdOn = seed.createdOn;
        this.updatedOn = seed.updatedOn;
    }
    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row) {
        var model = new this(row);
        model[_Model.symHandler] = this;
        return model;
    }
    static clone(model) {
        var clone = new this(model);
        clone[_Model.symHandler] = this;
        return clone;
    }
    static infuse(target, source) {
        if (target == undefined || source == undefined) throw new _errors.ModelError('Cannot infuse source into target: either source or target is undefined');
        if (target.constructor !== this || source.constructor !== this) throw new _errors.ModelError('Cannot infuse source into target: either source or target have a wrong constructor');
        if (target.id !== source.id) throw new _errors.ModelError('Cannot infuse source into target: source ID does not match target ID');
        var schema = this[symbols.dbSchema];
        if (!schema) throw new _errors.ModelError('Cannot infuse source into target: model schema is undefined');
        for (var field in schema) {
            switch (schema[field]) {
                case Number:
                case String:
                case Date:
                    target[field] = source[field];
                    break;
                case Object:
                    target[field] = cloneObject(source[field]);
                    break;
                case Array:
                    throw new _errors.ModelError('Arrays types are not yet supported in model schemas');
                default:
                    throw new _errors.ModelError(`Invalid field type in model schema`);
            }
        }
    }
    static areEqual(model1, model2) {
        if (model1 === undefined || model2 === undefined) return false;
        if (model1.constructor !== this || model2.constructor !== this) throw new _errors.ModelError('Cannot compare models: model constructors do not match');
        var retval = true;
        var schema = this[symbols.dbSchema];
        for (var field in schema) {
            switch (schema[field]) {
                case Number:
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
                    throw new _errors.ModelError('Arrays types are not yet supported in model schemas');
                default:
                    throw new _errors.ModelError(`Invalid field type in model schema`);
            }
            if (retval === false) break;
        }
        return retval;
    }
    static getSyncQueries(original, current) {
        var queries = [];
        if (original === undefined && current !== undefined) {
            let qInsertModel = this[symbols.insertQuery];
            if (qInsertModel === undefined) {
                qInsertModel = buildInsertQuery(this[symbols.dbTable], this[symbols.dbSchema]);
                this[symbols.insertQuery] = qInsertModel;
            }
            queries.push(new qInsertModel(current));
        } else if (original !== undefined && current === undefined) {
            let qDeleteModel = this[symbols.deleteQuery];
            if (qDeleteModel === undefined) {
                qDeleteModel = buildDeleteQuery(this[symbols.dbTable]);
                this[symbols.deleteQuery] = qDeleteModel;
            }
            queries.push(new qDeleteModel(original));
        } else if (original !== undefined && current !== undefined) {
            let qUpdateModel = this[symbols.updateQuery];
            if (qUpdateModel === undefined) {
                qUpdateModel = buildUpdateQuery(this[symbols.dbTable], this[symbols.dbSchema]);
                this[symbols.updateQuery] = qUpdateModel;
            }
            queries.push(new qUpdateModel(current));
        }
        return queries;
    }
    static getFetchOneQuery(selector, forUpdate, name) {
        if (forUpdate === undefined) forUpdate = false;

        var qFetchQuery = this[symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[symbols.dbTable], this[symbols.dbSchema], this);
            this[symbols.fetchQuery] = qFetchQuery;
        }
        return new qFetchQuery(selector, 'object', name, forUpdate);
    }
    static getFetchAllQuery(selector, forUpdate, name) {
        if (forUpdate === undefined) forUpdate = false;

        var qFetchQuery = this[symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[symbols.dbTable], this[symbols.dbSchema], this);
            this[symbols.fetchQuery] = qFetchQuery;
        }
        return new qFetchQuery(selector, 'list', name, forUpdate);
    }
}

exports.AbstractModel = AbstractModel;

__decorate([(0, _decorators.dbField)(Number)], AbstractModel.prototype, "id");
__decorate([(0, _decorators.dbField)(Date)], AbstractModel.prototype, "createdOn");
__decorate([(0, _decorators.dbField)(Date)], AbstractModel.prototype, "updatedOn");
// QUERY BUILDERS
// ================================================================================================
function buildFetchQuery(table, schema, handler) {
    if (table == undefined || table.trim() === '') throw new _errors.ModelError('Cannot build a fetch query: model table is undefined');
    if (schema == undefined) throw new _errors.ModelError('Cannot build a fetch query: model schema is undefined');
    var fields = [];
    for (var field in schema) {
        fields.push(`${ (0, _util.camelToSnake)(field) } AS "${ field }"`);
    }
    var querySpec = `SELECT ${ fields.join(',') } FROM ${ table }`;
    return class class_1 {
        constructor(selector, mask, name, forUpdate) {
            var criteria = [];
            for (var filter in selector) {
                if (filter in schema === false) throw new _errors.ModelQueryError('Cannot build a fetch query: model selector and schema are incompatible');
                if (selector[filter] && Array.isArray(selector[filter])) {
                    criteria.push(`${ (0, _util.camelToSnake)(filter) } IN ({{${ filter }}})`);
                } else {
                    criteria.push(`${ (0, _util.camelToSnake)(filter) }={{${ filter }}}`);
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
    if (table == undefined || table.trim() === '') throw new _errors.ModelError('Cannot build an insert query: model table is undefined');
    if (schema == undefined) throw new _errors.ModelError('Cannot build an insert query: model schema is undefined');
    var fields = [];
    var params = [];
    for (var field in schema) {
        fields.push((0, _util.camelToSnake)(field));
        params.push(`{{${ field }}}`);
    }
    var querySpec = `INSERT INTO ${ table } (${ fields.join(',') }) VALUES (${ params.join(',') });`;
    return class class_2 {
        constructor(model) {
            this.text = querySpec;
            this.params = model;
        }
    };
}
function buildUpdateQuery(table, schema) {
    if (table == undefined || table.trim() === '') throw new _errors.ModelError('Cannot build an update query: model table is undefined');
    if (schema == undefined) throw new _errors.ModelError('Cannot build an update query: model schema is undefined');
    var fields = [];
    for (var field in schema) {
        if (field === 'id' || field === 'createdOn') continue;
        fields.push(`${ (0, _util.camelToSnake)(field) }={{${ field }}}`);
    }
    var querySpec = `UPDATE ${ table } SET ${ fields.join(',') }`;
    return class class_3 {
        constructor(model) {
            this.text = querySpec + ` WHERE id = ${ model.id };`;
            this.params = model;
        }
    };
}
function buildDeleteQuery(table) {
    if (table == undefined || table.trim() === '') throw new _errors.ModelError('Cannot build a delete query: model table is undefined');
    return class class_4 {
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
//# sourceMappingURL=../../bin/lib/AbstractModel.js.map