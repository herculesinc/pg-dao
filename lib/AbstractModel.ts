// IMPORTS 
// ================================================================================================
import { Query, QueryMask } from 'pg-io';
import { Model, ModelQuery, ModelHandler, symHandler, IdGenerator } from './Model';
import { DbField } from './schema';
import { dbField } from './decorators'
import { AbstractActionQuery, AbstractModelQuery } from './queries';
import { ModelError, ModelQueryError } from './errors';
import { camelToSnake } from './util'

// MODULE VARIABLES
// ================================================================================================
export const symbols = {
    fetchQuery      : Symbol(),
	updateQuery     : Symbol(),
	insertQuery     : Symbol(),
	deleteQuery     : Symbol(),
    dbTable         : Symbol(),
    dbSchema        : Symbol(),
    idGenerator     : Symbol(),
    arrayComparator : Symbol()
};

// INTERFACES
// ================================================================================================
interface FetchQueryConstructor {
    new(selector: any, mask: string, name: string, forUpdate: boolean): ModelQuery<any>;
}

interface InsertQueryConstructor {
    new(model: Model): Query;
}

interface UpdateQueryConstructor {
    new(model: Model, changes: string[]): Query;
}

interface DeleteQueryConstructor {
    new(model: Model): Query;
}

// ABSTRACT MODEL CLASS DEFINITION
// ================================================================================================
export class AbstractModel implements Model {
    @dbField(String, { readonly: true })
    id: string;
    
    @dbField(Date, { readonly: true })
    createdOn: Date;
    
    @dbField(Date)
    updatedOn: Date;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(seed: any) {
        if (!seed) throw new ModelError('Cannot instantiate a model: model seed is undefined');
        if (!seed.id) throw new ModelError('Cannot instantiate a model: model id is undefined');
         
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
        this[symHandler] = this.constructor;
    }
  
    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row: any): any {
        return new this(row);
    }
    
    static build(id: string, attributes: any): any {
        if (attributes.id) 
            throw new ModelError('Cannot build a mode: model attributes contain id property');
        
        return new this(Object.assign({ id: id }, attributes));
    }

    static clone(model: Model): any {
        if (model == undefined)
            throw new ModelError('Cannot clone model: source model is undefined');
        
        if (model.constructor !== this)
            throw new ModelError('Cannot clone model: source model has a wrong constructor');
        
        const schema = this[symbols.dbSchema];
        if (!schema) throw new ModelError('Cannot clone model: model schema is undefined')

        const seed: any = {};
        for (let fieldName in schema) {
            let field: DbField = schema[fieldName];
            switch (field.type) {
                case Number: case Boolean: case String:
                    seed[field.name] = model[field.name];
                    break;
                case Date: case Object: case Array:
                    seed[field.name] = field.clone(model[field.name]);
                    break;
                default:
                    throw new ModelError('Cannot clone model: field type is invalid')
            }
        }

        return new this(seed);
    }
    
    static infuse(target: Model, source: Model) {
        if (target == undefined || source == undefined)
            throw new ModelError('Cannot infuse source into target: either source or target is undefined');
            
        if (target.constructor !== this || source.constructor !== this)
            throw new ModelError('Cannot infuse source into target: either source or target have a wrong constructor');
            
        if (target.id !== source.id)
            throw new ModelError('Cannot infuse source into target: source ID does not match target ID');

        const schema = this[symbols.dbSchema];
        if (!schema) throw new ModelError('Cannot infuse source into target: model schema is undefined')
        
        for (let fieldName in schema) {
            let field: DbField = schema[fieldName];
            if (field.readonly) continue;
            switch (field.type) {
                case Number: case Boolean: case String:
                    target[field.name] = source[field.name];
                    break;
                case Date: case Object: case Array:
                    target[field.name] = field.clone(source[field.name]);
                    break;
                default:
                    throw new ModelError('Cannot infuse source into target: field type is invalid')
            }
        }
    }

    static compare(original: AbstractModel, current: AbstractModel): string[] {
        if (original == undefined || current == undefined) return undefined;
        if (original.constructor !== this || current.constructor !== this)
            throw new ModelError('Cannot compare models: model constructors do not match');

        const changes: string[] = [];
        const schema = this[symbols.dbSchema];
        for (let fieldName in schema) {
            let field: DbField = schema[fieldName];
            if (field.readonly) continue;
            switch (field.type) {
                case Number: case Boolean: case String:
                    if (original[fieldName] != current[fieldName]) {
                        changes.push(fieldName);
                    }
                    break;
                case Date: case Object: case Array:
                    if (!field.areEqual(original[fieldName], current[fieldName])) {
                        changes.push(fieldName);
                    }
                    break;
                default:
                    throw new ModelError('Cannot compare models: field type is invalid')
            }
        }
        return changes;
    }
    
    static areEqual(model1: AbstractModel, model2: AbstractModel): boolean {
        if (model1 == undefined && model2 == undefined) return true;
        if (model1 == undefined || model2 == undefined) return false;
        if (model1.constructor !== this || model2.constructor !== this)
            throw new ModelError('Cannot compare models: model constructors do not match');
        
        const schema = this[symbols.dbSchema];
        for (let fieldName in schema) {
            let field: DbField = schema[fieldName];
            if (field.readonly) continue;
            switch (field.type) {
                case Number: case Boolean: case String:
                    if (model1[fieldName] != model2[fieldName]) return false;
                    break;
                case Date: case Object: case Array:
                    if (!field.areEqual(model1[fieldName], model2[fieldName])) return false;
                    break;
                default:
                    throw new ModelError('Cannot compare models: field type is invalid')
            }
        }
        return true;
    }

    static getSyncQueries(original: AbstractModel, current: AbstractModel, changes?: string[]): Query[] {
        const queries: Query[] = [];
        if (!original && current) {
            let qInsertModel: InsertQueryConstructor = this[symbols.insertQuery];
            if (!qInsertModel) {
                qInsertModel = buildInsertQuery(this[symbols.dbTable], this[symbols.dbSchema]);
                this[symbols.insertQuery] = qInsertModel;
            }
            queries.push(new qInsertModel(current));
        }
        else if (original && !current) {
            let qDeleteModel: DeleteQueryConstructor = this[symbols.deleteQuery];
            if (!qDeleteModel) {
                qDeleteModel = buildDeleteQuery(this[symbols.dbTable]);
                this[symbols.deleteQuery] = qDeleteModel;   
            }
            queries.push(new qDeleteModel(original));
        }
        else if (original && current) {
            let qUpdateModel: UpdateQueryConstructor = this[symbols.updateQuery];
            if (!qUpdateModel) {
                qUpdateModel = buildUpdateQuery(this[symbols.dbTable], this[symbols.dbSchema]);
                this[symbols.updateQuery] = qUpdateModel;
            }
            queries.push(new qUpdateModel(current, changes));
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
        constructor(selector: any, mask: QueryMask, name: string, forUpdate: boolean) {
            super(handler, mask, forUpdate);
            
            var criteria: string[] = [];
            for (let filter in selector) {
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

function buildInsertQuery(table: string, schema: any): InsertQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build an insert query: model table is undefined');
        
    if (schema == undefined)
        throw new ModelError('Cannot build an insert query: model schema is undefined');
    
    const fields: string[] = [];
    const params: string[] = [];
    for (let fieldName in schema) {
        let field: DbField = schema[fieldName];
        fields.push(camelToSnake(field.name));
        params.push(`{{${field.name}}}`)
    }
    const queryText = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${params.join(',')});`;
    
    return class extends AbstractActionQuery {
        constructor(model: Model) {
            super(`qInsert${model[symHandler].name}Model`, model);
            this.text = queryText;
        }
    };
}

function buildUpdateQuery(table: string, schema: any): UpdateQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build an update query: model table is undefined');
        
    if (schema == undefined)
        throw new ModelError('Cannot build an update query: model schema is undefined');
    
    const fieldMap: Map<string, string> = new Map();
    for (let fieldName in schema) {
        let field: DbField = schema[fieldName];
        if (field.readonly) continue;
        fieldMap.set(field.name, `${camelToSnake(field.name)}={{${field.name}}}`);
    }
    const queryBase = `UPDATE ${table} SET `;
    
    return class extends AbstractActionQuery {
        constructor(model: Model, changes: string[]) {
            super(`qUpdate${model[symHandler].name}Model`, model);
            const fields: string[] = [];
            for (let changedField of changes) {
                let field = fieldMap.get(changedField);
                if (!field) throw new ModelQueryError(`Cannot create model quer: field '${changedField}' cannot be updated`);
                fields.push(field);
            }
            this.text = queryBase + `${fields.join(',')} WHERE id = '${model.id}';`;
        }
    };
}

function buildDeleteQuery(table: string): DeleteQueryConstructor {
    
    if (table == undefined || table.trim() === '')
        throw new ModelError('Cannot build a delete query: model table is undefined');
    
    return class extends AbstractActionQuery {
        constructor(model: Model) {
            super(`qDelete${model[symHandler].name}Model`);
            this.text = `DELETE FROM ${table} WHERE id = '${model.id}';`;
        }
    };
}