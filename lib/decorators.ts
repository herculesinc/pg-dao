// IMPORTS 
// ================================================================================================
import { AbstractModel, symbols } from './AbstractModel';
import { IdGenerator } from './Model'
import { ModelError } from './errors';

// DECORATOR DEFINITIONS
// ================================================================================================
export function dbModel(table: string, idGenerator: IdGenerator): ClassDecorator {
    if (table === undefined || table === null || table.trim() === '')
        throw new ModelError('Model table name cannot be empty');
    
    return function (classConstructor: any) {
        classConstructor[symbols.dbTable] = table;
        var schemaMap: Map<string, any> = classConstructor.prototype[symbols.dbSchema];
        classConstructor[symbols.dbSchema] = Object.assign({},
            schemaMap.get(AbstractModel.name), schemaMap.get(classConstructor.name));
        classConstructor[symbols.idGenerator] = idGenerator;
    }
}

export function dbField(fieldType: any): PropertyDecorator {
    switch (fieldType) {
        case Number: case Boolean: case String: case Date: case Object:
            break;
        case Array:
            throw new ModelError('Arrays types are not yet supported in model schemas');
        default:
            throw new ModelError(`Invalid field type in model schema`);
    }    
    
    return function (classPrototype: any, property: string) {
        if (typeof property !== 'string')
            throw new ModelError('Database field property must be a string');
        
        var schemaMap: Map<string, any> = classPrototype[symbols.dbSchema];
        if (schemaMap === undefined) {
            schemaMap = new Map<string, any>();
            classPrototype[symbols.dbSchema] = schemaMap; 
        }
        
        var schema = schemaMap.get(classPrototype.constructor.name);
        if (schema === undefined) {
            schema = {};
            schemaMap.set(classPrototype.constructor.name, schema);
        }
        schema[property] = fieldType;
    }
}