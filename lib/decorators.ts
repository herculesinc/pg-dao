// IMPORTS 
// ================================================================================================
import { AbstractModel, symbols } from './AbstractModel';
import { IdGenerator } from './Model'
import { ModelError } from './errors';
import { DbSchema, DbField, FieldHandler } from './schema';

// INTERFACES
// ================================================================================================
export interface dbFieldOptions {
    readonly?   : boolean;
    secret?     : string;
    handler?    : FieldHandler;
}

// DECORATOR DEFINITIONS
// ================================================================================================
export function dbModel(table: string, idGenerator: IdGenerator): ClassDecorator {
	// validate table name
	if (!table) throw new ModelError('Cannot build model schema: table name is undefined');
	if (table.trim() === '') throw new ModelError('Cannot build model schema: table name is invalid');

	// vlaidate ID Generator
	if (!idGenerator) throw new ModelError('Cannot build model schema: ID Generator is undefined');
	if (typeof idGenerator.getNextId !== 'function')
		throw new ModelError('Cannot build model schema: ID Generator is invalid');
        
    return function (classConstructor: any) {
        const schemaMap: Map<string, any> = classConstructor.prototype[symbols.dbFields];
        const fields = Object.assign({},
            schemaMap.get(AbstractModel.name), schemaMap.get(classConstructor.name));
        classConstructor[symbols.dbSchema] = new DbSchema(table, idGenerator, fields);
    }
}

export function dbField(fieldType: any, options?: dbFieldOptions): PropertyDecorator {
    // make sure options are set
    options = Object.assign({ readonly: false }, options);

    return function (classPrototype: any, property: string) {
        const field = new DbField(property, fieldType, options.readonly, options.secret, options.handler);
        
        let schemaMap: Map<string, any> = classPrototype[symbols.dbFields];
        if (!schemaMap) {
            schemaMap = new Map<string, any>();
            classPrototype[symbols.dbFields] = schemaMap; 
        }
        
        let schema = schemaMap.get(classPrototype.constructor.name);
        if (!schema) {
            schema = {};
            schemaMap.set(classPrototype.constructor.name, schema);
        }
        schema[property] = field;
    }
}