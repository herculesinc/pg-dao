// IMPORTS 
// ================================================================================================
import { AbstractModel, symbols } from './AbstractModel';
import { ModelError } from './errors';

// DECORATOR DEFINITIONS
// ================================================================================================
export function dbModel(table: string) {
    if (table === undefined || table === null || table.trim() === '')
        throw new ModelError('Model table name cannot be empty');
    
    return function (classConstructor: any) {
        classConstructor[symbols.dbTable] = table;
        classConstructor[symbols.dbSchema] = classConstructor.prototype[symbols.dbSchema];
    }
}

export function dbField(fieldType: any) {
    switch (fieldType) {
        case Number: case String: case Date: case Object:
            break;
        case Array:
            throw new ModelError('Arrays types are not yet supported in model schemas');
        default:
            throw new ModelError(`Invalid field type in model schema`);
    }    
    
    return function (classPrototype: any, property: string) {
        if (typeof property !== 'string')
            throw new ModelError('Database field property must be a string');
        
        var schema = classPrototype[symbols.dbSchema];
        if (schema === undefined) {
            schema = {};
            classPrototype[symbols.dbSchema] = schema; 
        }
        schema[property] = fieldType;
    }
}