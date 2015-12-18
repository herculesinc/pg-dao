// IMPORTS 
// ================================================================================================
import { Query } from 'pg-io';
import { Model, ModelQuery, ModelHandler, symHandler, IdGenerator } from './Model';
import { DbField } from './schema';
import { dbField } from './decorators'
import { AbstractActionQuery, AbstractModelQuery} from './queries';
import { ModelError, ModelQueryError } from './errors';
import { camelToSnake, deepCompare, ArrayComparator, deepClone } from './util'

// MODULE VARIABLES
// ================================================================================================
export var symbols = {
    fetchQuery  : Symbol(),
	updateQuery : Symbol(),
	insertQuery : Symbol(),
	deleteQuery : Symbol(),
    dbTable     : Symbol(),
    dbSchema    : Symbol(),
    idGenerator : Symbol(),
    arrayComparator: Symbol()
}

// INTERFACES
// ================================================================================================
interface ModelQueryConstructor {
    new (model: Model): Query;
}

interface FetchQueryConstructor {
    new(selector: any, mask: string, name: string, forUpdate: boolean): ModelQuery<any>;
}

// ABSTRACT MODEL CLASS DEFINITION
// ================================================================================================
export class AbstractModel implements Model {
    @dbField(String, true)
    id: string;
    
    @dbField(Date, true)
    createdOn: Date;
    
    @dbField(Date)
    updatedOn: Date;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(seed: any) {
        if (!seed) throw new ModelError('Cannot instantiate a model: model seed is undefined');
        if (!seed.id) throw new ModelError('Cannot instantiate a model: model id is undefined');
         
        this.id = seed.id;
        this.createdOn = seed.createdOn ? seed.createdOn : new Date();
        this.updatedOn = seed.updatedOn ? seed.updatedOn : new Date();
    }
  
    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row: any): any {
        var model = new this(row);
        model[symHandler] = this;
        return model;
    }
    
    static build(id: string, attributes: any): any {
        if ('id' in attributes) 
            throw new ModelError('Cannot build a mode: model attributes contain id property');
        
        var timestamp = new Date();
        var model = new this(Object.assign({
            id: id,
            createdOn: timestamp,
            updatedOn: timestamp
        }, attributes));
        model[symHandler] = this;
        return model;
    }

    static clone(model: Model): any {
        if (model == undefined)
            throw new ModelError('Cannot clone model: source model is undefined');
        
        if (model.constructor !== this)
            throw new ModelError('Cannot clone model: source model has a wrong constructor');
        
        var schema = this[symbols.dbSchema];
        if (!schema) throw new ModelError('Cannot clone model: model schema is undefined')

        // TODO: find a better mechanism for cloning models
        var seed: any = {};
        for (var fieldName in schema) {
            var field: DbField = schema[fieldName];
            seed[field.name] = deepClone(model[field.name]);
        }
        
        var clone = new this(seed);
        clone[symHandler] = this;
        return clone;
    }
    
    static infuse(target: Model, source: Model) {
        if (target == undefined || source == undefined)
            throw new ModelError('Cannot infuse source into target: either source or target is undefined');
            
        if (target.constructor !== this || source.constructor !== this)
            throw new ModelError('Cannot infuse source into target: either source or target have a wrong constructor');
            
        if (target.id !== source.id)
            throw new ModelError('Cannot infuse source into target: source ID does not match target ID');

        var schema = this[symbols.dbSchema];
        if (!schema) throw new ModelError('Cannot infuse source into target: model schema is undefined')
        
        for (var fieldName in schema) {
            var field: DbField = schema[fieldName];
            if (field.readonly) continue;
            target[field.name] = deepClone(source[field.name]);
        }
    }
    
    static areEqual(model1: AbstractModel, model2: AbstractModel): boolean {
        if (model1 == undefined || model2 == undefined) return false;
        if (model1.constructor !== this || model2.constructor !== this)
            throw new ModelError('Cannot compare models: model constructors do not match');
        
        var retval = true;
        var schema = this[symbols.dbSchema];
        var arrayComparator: ArrayComparator = this[symbols.arrayComparator];
        for (var fieldName in schema) {
            var field: DbField = schema[fieldName];
            retval = deepCompare(model1[field.name], model2[field.name], arrayComparator);
            if (retval === false) break;
        }
        
        return retval;
    }

    static getSyncQueries(original: AbstractModel, current: AbstractModel): Query[] {
        var queries: Query[] = [];
        if (original === undefined && current !== undefined) {
            let qInsertModel = this[symbols.insertQuery];
            if (qInsertModel === undefined) {
                qInsertModel = buildInsertQuery(this[symbols.dbTable], this[symbols.dbSchema]);
                this[symbols.insertQuery] = qInsertModel;
            }
            queries.push(new qInsertModel(current));
        }
        else if (original !== undefined && current === undefined) {
            let qDeleteModel = this[symbols.deleteQuery];
            if (qDeleteModel === undefined) {
                qDeleteModel = buildDeleteQuery(this[symbols.dbTable]);
                this[symbols.deleteQuery] = qDeleteModel;   
            }
            queries.push(new qDeleteModel(original));
        }
        else if (original !== undefined && current !== undefined) {
            let qUpdateModel = this[symbols.updateQuery];
            if (qUpdateModel === undefined) {
                qUpdateModel = buildUpdateQuery(this[symbols.dbTable], this[symbols.dbSchema]);
                this[symbols.updateQuery] = qUpdateModel;
            }
            queries.push(new qUpdateModel(current));
        }

        return queries;
    }
    
    static getFetchOneQuery(selector: any, forUpdate = false, name?: string): ModelQuery<any> {
        var qFetchQuery: FetchQueryConstructor = this[symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[symbols.dbTable], this[symbols.dbSchema], this);
            this[symbols.fetchQuery] = qFetchQuery;
        }
        name = name || `qFetchOne${this.name}Model`;
        return new qFetchQuery(selector, 'object', name, forUpdate);
    }
    
    static getFetchAllQuery(selector: any, forUpdate = false, name?: string): ModelQuery<any> {
        var qFetchQuery: FetchQueryConstructor = this[symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[symbols.dbTable], this[symbols.dbSchema], this);
            this[symbols.fetchQuery] = qFetchQuery;
        }
        name = name || `qFetchAll${this.name}Models`;
        return new qFetchQuery(selector, 'list', name, forUpdate);
    }
    
    static getIdGenerator(): IdGenerator {
        return this[symbols.idGenerator];
    }
}

// QUERY BUILDERS
// ================================================================================================
function buildFetchQuery(table: string, schema: any, handler: ModelHandler<any>): FetchQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build a fetch query: model table is undefined');
        
    if (schema == undefined)
        throw new ModelError('Cannot build a fetch query: model schema is undefined');
    
    var fields: string[] = [];
    for (var fieldName in schema) {
        var field: DbField = schema[fieldName];
        fields.push(`${camelToSnake(field.name)} AS "${field.name}"`);
    }
    var querySpec = `SELECT ${fields.join(',')} FROM ${table}`;
    
    return class extends AbstractModelQuery<any>{
        constructor(selector: any, mask: string, name: string, forUpdate: boolean) {
            super(handler, mask, forUpdate);
            
            var criteria: string[] = [];
            for (var filter in selector) {
                if (filter in schema === false)
                    throw new ModelQueryError('Cannot build a fetch query: model selector and schema are incompatible');
                if (selector[filter] && Array.isArray(selector[filter])) {
                    criteria.push(`${camelToSnake(filter)} IN ([[${filter}]])`);
                }
                else {
                    criteria.push(`${camelToSnake(filter)}={{${filter}}}`);
                }
            }
            
            this.name = name;
            this.text = querySpec + ` WHERE ${criteria.join(' AND ')} ${ forUpdate ? 'FOR UPDATE' : ''};`;
            this.params = selector;
        }
    };
}

function buildInsertQuery(table: string, schema: any): ModelQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build an insert query: model table is undefined');
        
    if (schema == undefined)
        throw new ModelError('Cannot build an insert query: model schema is undefined');
    
    var fields: string[] = [];
    var params: string[] = [];
    for (var fieldName in schema) {
        var field: DbField = schema[fieldName];
        fields.push(camelToSnake(field.name));
        params.push(`{{${field.name}}}`)
    }
    var querySpec = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${params.join(',')});`;
    
    return class extends AbstractActionQuery {
        constructor(model: Model) {
            super(`qInsert${model[symHandler].name}Model`, model);
            this.text = querySpec;
        }
    };
}

function buildUpdateQuery(table: string, schema: any): ModelQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build an update query: model table is undefined');
        
    if (schema == undefined)
        throw new ModelError('Cannot build an update query: model schema is undefined');
    
    var fields: string[] = [];
    for (var fieldName in schema) {
        var field: DbField = schema[fieldName];
        if (field.readonly) continue;
        fields.push(`${camelToSnake(field.name)}={{${field.name}}}`);
    }
    var querySpec = `UPDATE ${table} SET ${fields.join(',')}`;
    
    return class extends AbstractActionQuery {
        constructor(model: Model) {
            super(`qUpdate${model[symHandler].name}Model`, model)
            this.text = querySpec + ` WHERE id = ${model.id};`;
        }
    };
}

function buildDeleteQuery(table: string): ModelQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build a delete query: model table is undefined');
    
    return class extends AbstractActionQuery {
        constructor(model: Model) {
            super(`qDelete${model[symHandler].name}Model`);
            this.text = `DELETE FROM ${table} WHERE id = ${model.id};`;
        }
    };
}