// IMPORTS 
// ================================================================================================
import { Query } from 'pg-io';
import { Model, symHandler } from './Model';
import { dbField } from './decorators'
import { ModelError } from './errors';
import { camelToSnake } from './util'

// MODULE VARIABLES
// ================================================================================================
export var symbols = {
	updateQuery : Symbol(),
	insertQuery : Symbol(),
	deleteQuery : Symbol(),
    dbTable     : Symbol(),
    dbSchema    : Symbol()
}

// INTERFACES
// ================================================================================================
interface ModelQueryConstructor {
    new (model: Model): Query;
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
                case Number: case String: case Date:
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
                case Number: case String:
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

    static getSyncQueries(original: Model, current: Model): Query[] {
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
}

// QUERY BUILDERS
// ================================================================================================
function buildInsertQuery(table: string, schema: any): ModelQueryConstructor {
    
    var fields: string[] = [];
    var params: string[] = [];
    for (var field in schema) {
        fields.push(camelToSnake(field));
        params.push(`{{${field}}}`)
    }
    
    return class {
        text: string;
        params: Model;
        
        constructor(model: Model) {
            this.text = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${params.join(',')});`;
            this.params = model;
        }
    };
}

function buildUpdateQuery(table: string, schema: any): ModelQueryConstructor {
    
    var fields: string[] = [];
    for (var field in schema) {
        if (field === 'id' || field === 'createdOn') continue;
        fields.push(`${camelToSnake(field)}={{${field}}}`);
    }
    
    return class {
        text: string;
        params: Model;
        
        constructor(model: Model) {
            this.text = `UPDATE ${table} SET ${fields.join(',')} WHERE id = ${model.id};`;
            this.params = model;
        }
    };
}

function buildDeleteQuery(table: string): ModelQueryConstructor {
    
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