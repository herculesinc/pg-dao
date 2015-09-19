// IMPORTS 
// ================================================================================================
import { Query } from 'pg-io';
import { Model, ModelQuery, ModelHandler, symHandler, IdGenerator } from './Model';
import { dbField } from './decorators'
import { ModelError, ModelQueryError } from './errors';
import { camelToSnake } from './util'

// MODULE VARIABLES
// ================================================================================================
export var symbols = {
    fetchQuery  : Symbol(),
	updateQuery : Symbol(),
	insertQuery : Symbol(),
	deleteQuery : Symbol(),
    dbTable     : Symbol(),
    dbSchema    : Symbol(),
    idGenerator : Symbol()
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
    @dbField(Number)
    id: number;
    
    @dbField(Date)
    createdOn: Date;
    
    @dbField(Date)
    updatedOn: Date;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(seed: any) {
        if (!seed) throw new ModelError('Cannot instantiate a model: model seed is undefined');
        if (!seed.id) throw new ModelError('Cannot instantiate a model: model id is undefined');
         
        this.id = seed.id;
        this.createdOn = seed.createdOn;
        this.updatedOn = seed.updatedOn;
    }

    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row: any): any {
        var model = new this(row);
        model[symHandler] = this;
        return model;
    }
    
    static build(id: number, attributes: any): any {
        if ('id' in attributes) 
            throw new ModelError('Cannot build a mode: model attributes contain id property');
        
        var model = new this(Object.assign({
            id: id,
            createdOn: new Date(),
            updatedOn: new Date()
        }, attributes));
        model[symHandler] = this;
        return model;
    }

    static clone(model: Model): any {
        var clone = new this(model);
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
        
        for (var field in schema) {
            switch (schema[field]) {
                case Number: case Boolean: case String: case Date:
                    target[field] = source[field];
                    break;
                case Object:
                    target[field] = cloneObject(source[field]);
                    break;
                case Array:
                    throw new ModelError('Arrays types are not yet supported in model schemas');
                default:
                    throw new ModelError(`Invalid field type in model schema`);
            }    
        }
    }
    
    static areEqual(model1: AbstractModel, model2: AbstractModel): boolean {
        if (model1 === undefined || model2 === undefined) return false;
        if (model1.constructor !== this || model2.constructor !== this)
            throw new ModelError('Cannot compare models: model constructors do not match');
        
        var retval = true;
        var schema = this[symbols.dbSchema];
        for (var field in schema) {
            switch (schema[field]) {
                case Number: case Boolean: case String:
                    retval = (model1[field] === model2[field]);
                    break;
                case Date:
                    retval = compareDates(model1[field], model2[field]);
                    break;
                case Object:
                    retval = compareObjects(model1[field], model2[field]);
                    break;
                case Array:
                    throw new ModelError('Arrays types are not yet supported in model schemas');
                default:
                    throw new ModelError(`Invalid field type in model schema`);
            }    
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
        return new qFetchQuery(selector, 'object', name, forUpdate);
    }
    
    static getFetchAllQuery(selector: any, forUpdate = false, name?: string): ModelQuery<any> {
        var qFetchQuery: FetchQueryConstructor = this[symbols.fetchQuery];
        if (qFetchQuery == undefined) {
            qFetchQuery = buildFetchQuery(this[symbols.dbTable], this[symbols.dbSchema], this);
            this[symbols.fetchQuery] = qFetchQuery;
        }
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
    for (var field in schema) {
        fields.push(`${camelToSnake(field)} AS "${field}"`);
    }
    var querySpec = `SELECT ${fields.join(',')} FROM ${table}`;
    
    return class {
        name: string;
        text: string;
        params: any;
        mask: string;
        mutable: boolean;
        handler: ModelHandler<any>;
        
        constructor(selector: any, mask: string, name: string, forUpdate: boolean) {
            
            var criteria: string[] = [];
            for (var filter in selector) {
                if (filter in schema === false)
                    throw new ModelQueryError('Cannot build a fetch query: model selector and schema are incompatible');
                if (selector[filter] && Array.isArray(selector[filter])) {
                    criteria.push(`${camelToSnake(filter)} IN ({{${filter}}})`);
                }
                else {
                    criteria.push(`${camelToSnake(filter)}={{${filter}}}`);
                }
            }
            
            this.name = name;
            this.text = querySpec + ` WHERE ${criteria.join(' AND ')} ${ forUpdate ? 'FOR UPDATE' : ''};`;
            this.params = selector;
            this.mask = mask;
            this.mutable = forUpdate;
            this.handler = handler;
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
    for (var field in schema) {
        fields.push(camelToSnake(field));
        params.push(`{{${field}}}`)
    }
    var querySpec = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${params.join(',')});`;
    
    return class {
        text: string;
        params: Model;
        
        constructor(model: Model) {
            this.text = querySpec;
            this.params = model;
        }
    };
}

function buildUpdateQuery(table: string, schema: any): ModelQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build an update query: model table is undefined');
        
    if (schema == undefined)
        throw new ModelError('Cannot build an update query: model schema is undefined');
    
    var fields: string[] = [];
    for (var field in schema) {
        if (field === 'id' || field === 'createdOn') continue;
        fields.push(`${camelToSnake(field)}={{${field}}}`);
    }
    var querySpec = `UPDATE ${table} SET ${fields.join(',')}`;
    
    return class {
        text: string;
        params: Model;
        
        constructor(model: Model) {
            this.text = querySpec + ` WHERE id = ${model.id};`;
            this.params = model;
        }
    };
}

function buildDeleteQuery(table: string): ModelQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build a delete query: model table is undefined');
    
    return class {
        text: string;
        
        constructor(model: Model) {
            this.text = `DELETE FROM ${table} WHERE id = ${model.id};`;
        }
    };
}

// HELPER FUNCTIONS
// ================================================================================================
function compareDates(date1: Date, date2: Date): boolean {
    if ((date1 === null || date1 === undefined) && (date2 === null || date2 === undefined))
        return true;
        
    if (date1 === null || date1 === undefined || date2 === null || date2 === undefined)
        return false;
        
    return date1.valueOf() === date2.valueOf();
}

function compareObjects(object1: any, object2: any): boolean {
    if ((object1 === null || object1 === undefined) && (object2 === null || object2 === undefined))
        return true;
        
    if (object1 === null || object1 === undefined || object2 === null || object2 === undefined)
        return false;
        
    // TODO: make the comparison more intelligent
    return JSON.stringify(object1) === JSON.stringify(object2);
}

function cloneObject(source: any): any {
    if (source === undefined || source === null) return undefined;
    
    // TODO: make cloning more intelligent
    return JSON.parse(JSON.stringify(source));
}