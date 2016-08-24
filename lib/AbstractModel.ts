// IMPORTS 
// ================================================================================================
import { Query, QueryMask } from 'pg-io';
import { Model, ModelQuery, ModelHandler, symHandler, IdGenerator } from './Model';
import { DbSchema, DbField, FieldMap } from './schema';
import { dbField } from './decorators'
import { AbstractActionQuery, AbstractModelQuery } from './queries';
import { ModelError, ModelQueryError } from './errors';
import { encryptField, decryptField } from './util'

// MODULE VARIABLES
// ================================================================================================
export const symbols = {
    fetchQuery      : Symbol(),
	updateQuery     : Symbol(),
	insertQuery     : Symbol(),
	deleteQuery     : Symbol(),
    dbFields        : Symbol(),
    dbSchema        : Symbol()
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

    id          : string;    
    createdOn   : Date;
    updatedOn   : Date;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(seed: any, id?: string) {
        if (!seed) throw new ModelError('Cannot instantiate a model: model seed is undefined');
        if (!seed.id && !id) throw new ModelError('Cannot instantiate a model: model id is undefined');
        if (seed.id && id) throw new ModelError('Cannot instantiate a model: two model IDs provided');

        const schema: DbSchema = this.constructor[symbols.dbSchema];

        if (seed instanceof this.constructor || id) {
            // build or clone the model
            for (let field of schema.fields) {
                switch (field.type) {
                    case Number: case Boolean: case String:
                        this[field.name] = seed[field.name];
                        break;
                    case Date: case Object: case Array:
                        this[field.name] = field.clone(seed[field.name]);
                        break;
                    default:
                        throw new ModelError('Cannot clone model: field type is invalid')
                }
            }

            if (id) {
                // make sure to set the ID if it was provided
                this.id = id;

                // TODO: convert createdOn and updatedOn to Timestamp type
                if (!seed.createdOn) {
                    let timestamp = new Date();
                    this.createdOn = timestamp;
                    this.updatedOn = timestamp;
                }
                else {
                    this.createdOn = seed.createdOn instanceof Date ? seed.createdOn : new Date(seed.createdOn);
                    this.updatedOn = seed.updatedOn instanceof Date ? seed.updatedOn : new Date(seed.updatedOn);
                }
            }
        }
        else {
            // parse the database row, no cloning of fields needed
            for (let field of schema.fields) {
                if (field.secret) {
                    // TODO: implement lazy decrypting
                    this[field.name] = decryptField(seed[field.name], field.secret, field.type);
                }
                else {
                    this[field.name] = seed[field.name];
                }             
            }
        }

        // set model handler
        this[symHandler] = this.constructor;
    }
  
    // SCHEMA METHODS
    // --------------------------------------------------------------------------------------------
    static setSchema(tableName: string, idGenerator: IdGenerator, fields: FieldMap) {
        this[symbols.dbSchema] = new DbSchema(tableName, idGenerator, fields);
    }

    static getFieldSelectors(): string[] {
        const schema: DbSchema = this[symbols.dbSchema];
        const fieldSelectors: string[] = [];

        for (let field of schema.fields) {
            fieldSelectors.push(field.getter);
        }

        return fieldSelectors;
    }

    // MODEL HANDLER METHODS
    // --------------------------------------------------------------------------------------------
    static parse(row: any): any {
        if (!row) throw new ModelError('Cannot parse model: model row is undefined');
        return new this(row);
    }
    
    static build(id: string, attributes: any): any {
        if (!attributes) throw new ModelError('Cannot build a mode: attributes are undefined');
        return new this(attributes, id);
    }

    static clone(model: Model): any {
        if (!model) throw new ModelError('Cannot clone model: source model is undefined');
        if (model.constructor !== this)
            throw new ModelError('Cannot clone model: source model has a wrong constructor');
        return new this(model);
    }
    
    static infuse(target: Model, source: Model) {
        if (target == undefined || source == undefined)
            throw new ModelError('Cannot infuse source into target: either source or target is undefined');
            
        if (target.constructor !== this || source.constructor !== this)
            throw new ModelError('Cannot infuse source into target: either source or target have a wrong constructor');
            
        if (target.id !== source.id)
            throw new ModelError('Cannot infuse source into target: source ID does not match target ID');

        const schema: DbSchema = this[symbols.dbSchema];
        if (!schema) throw new ModelError('Cannot infuse source into target: model schema is undefined')
        
        for (let field of schema.fields) {
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
        const schema: DbSchema = this[symbols.dbSchema];
        for (let field of schema.fields) {
            if (field.readonly) continue;
            switch (field.type) {
                case Number: case Boolean: case String:
                    if (original[field.name] != current[field.name]) {
                        changes.push(field.name);
                    }
                    break;
                case Date: case Object: case Array:
                    if (!field.areEqual(original[field.name], current[field.name])) {
                        changes.push(field.name);
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
        
        const schema: DbSchema = this[symbols.dbSchema];
        for (let field of schema.fields) {
            if (field.readonly) continue;
            switch (field.type) {
                case Number: case Boolean: case String:
                    if (model1[field.name] != model2[field.name]) return false;
                    break;
                case Date: case Object: case Array:
                    if (!field.areEqual(model1[field.name], model2[field.name])) return false;
                    break;
                default:
                    throw new ModelError('Cannot compare models: field type is invalid')
            }
        }
        return true;
    }

    static getSyncQueries(original: AbstractModel, current: AbstractModel, changes?: string[]): Query[] {
        const queries: Query[] = [];
        const schema: DbSchema = this[symbols.dbSchema];
        if (!original && current) {
            let qInsertModel: InsertQueryConstructor = this[symbols.insertQuery];
            if (!qInsertModel) {
                qInsertModel = buildInsertQuery(schema);
                this[symbols.insertQuery] = qInsertModel;
            }
            queries.push(new qInsertModel(current));
        }
        else if (original && !current) {
            let qDeleteModel: DeleteQueryConstructor = this[symbols.deleteQuery];
            if (!qDeleteModel) {
                qDeleteModel = buildDeleteQuery(schema.table);
                this[symbols.deleteQuery] = qDeleteModel;   
            }
            queries.push(new qDeleteModel(original));
        }
        else if (original && current) {
            let qUpdateModel: UpdateQueryConstructor = this[symbols.updateQuery];
            if (!qUpdateModel) {
                qUpdateModel = buildUpdateQuery(schema);
                this[symbols.updateQuery] = qUpdateModel;
            }
            queries.push(new qUpdateModel(current, changes));
        }

        return queries;
    }
    
    static getFetchOneQuery(selector: any, forUpdate = false, name?: string): ModelQuery<any> {
        let qFetchQuery: FetchQueryConstructor = this[symbols.fetchQuery];
        if (!qFetchQuery) {
            qFetchQuery = buildFetchQuery(this[symbols.dbSchema], this);
            this[symbols.fetchQuery] = qFetchQuery;
        }
        name = name || `qFetchOne${this.name}Model`;
        return new qFetchQuery(selector, 'object', name, forUpdate);
    }
    
    static getFetchAllQuery(selector: any, forUpdate = false, name?: string): ModelQuery<any> {
        let qFetchQuery: FetchQueryConstructor = this[symbols.fetchQuery];
        if (!qFetchQuery) {
            qFetchQuery = buildFetchQuery(this[symbols.dbSchema], this);
            this[symbols.fetchQuery] = qFetchQuery;
        }
        name = name || `qFetchAll${this.name}Models`;
        return new qFetchQuery(selector, 'list', name, forUpdate);
    }
    
    static getIdGenerator(): IdGenerator {
        const schema: DbSchema = this[symbols.dbSchema];
        return schema.idGenerator;
    }
}

// QUERY BUILDERS
// ================================================================================================
function buildFetchQuery(schema: DbSchema, handler: ModelHandler<any>): FetchQueryConstructor {
    if (!schema) throw new ModelError('Cannot build a fetch query: model schema is undefined');
    
    const fieldGetters: string[] = [];
    for (let field of schema.fields) {
        fieldGetters.push(field.getter);
    }
    const querySpec = `SELECT ${fieldGetters.join(',')} FROM ${schema.table}`;
    
    return class extends AbstractModelQuery<any>{
        constructor(selector: any, mask: QueryMask, name: string, forUpdate: boolean) {
            super(handler, mask, forUpdate);
            
            const criteria: string[] = [];
            for (let filter in selector) {
                let field = schema.getField(filter);
                if (!field) {
                    throw new ModelQueryError('Cannot build a fetch query: model selector and schema are incompatible');
                }

                if (selector[filter] && Array.isArray(selector[filter])) {
                    criteria.push(`${field.snakeName} IN ([[${filter}]])`);
                }
                else {
                    criteria.push(`${field.snakeName}={{${filter}}}`);
                }
            }
            
            this.name = name;
            this.text = querySpec + ` WHERE ${criteria.join(' AND ')} ${ forUpdate ? 'FOR UPDATE' : ''};`;
            this.params = selector;
        }
    };
}

function buildInsertQuery(schema: DbSchema): InsertQueryConstructor {
    if (!schema) throw new ModelError('Cannot build an insert query: model schema is undefined');
    
    const fields: string[] = [];
    const params: string[] = [];
    const secretFields: DbField[] = [];

    for (let field of schema.fields) {
        fields.push(field.snakeName);
        params.push(`{{${field.name}}}`);
        if (field.secret) {
            secretFields.push(field);
        }
    }
    const queryText = `INSERT INTO ${schema.table} (${fields.join(',')}) VALUES (${params.join(',')});`;
    
    return class extends AbstractActionQuery {
        constructor(model: Model) {
            super(`qInsert${model[symHandler].name}Model`, model);
            this.text = queryText;

            if (secretFields.length) {
                const encryptedFields: any = {};
                for (let field of secretFields) {
                    encryptedFields[field.name] = encryptField(model[field.name], field.secret);
                }
                this.params = Object.assign({}, model, encryptedFields);
            }
        }
    };
}

function buildUpdateQuery(schema: DbSchema): UpdateQueryConstructor {
    if (!schema) throw new ModelError('Cannot build an update query: model schema is undefined');
    
    const queryBase = `UPDATE ${schema.table} SET `;
    
    return class extends AbstractActionQuery {
        constructor(model: Model, changes: string[]) {
            super(`qUpdate${model[symHandler].name}Model`, model);

            let hasEncryptedFields = false;
            const encryptedFields: any = {};
            const fieldSetters: string[] = [];
            for (let changedField of changes) {
                let field = schema.getField(changedField);
                if (!field) throw new ModelQueryError(`Cannot create model query: field '${changedField}' cannot be updated`);
                fieldSetters.push(field.setter);

                if (field.secret) {
                    hasEncryptedFields = true;
                    encryptedFields[field.name] = encryptField(model[field.name], field.secret);
                }
            }

            this.text = queryBase + `${fieldSetters.join(',')} WHERE id = '${model.id}';`;
            if (hasEncryptedFields) {
                this.params = Object.assign({}, model, encryptedFields);
            }
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