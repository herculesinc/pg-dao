// IMPORTS 
// ================================================================================================
import { AbstractModel, symbols } from './AbstractModel';
import { IdGenerator } from './Model'
import { ModelError } from './errors';
import { DbField } from './schema';
import { ArrayComparator, compareArraysAsSets, compareArraysStrict } from './util';

// INTERFACES
// ================================================================================================
export const enum ArrayComparison {
    strict = 1, set
}

// DECORATOR DEFINITIONS
// ================================================================================================
export function dbModel(table: string, idGenerator: IdGenerator, arrayComparison?: ArrayComparison): ClassDecorator {
    if (table == undefined || table.trim() === '')
        throw new ModelError('Model table name cannot be empty');
        
    if (!idGenerator) throw new ModelError('Model ID generator cannot be empty');
    
    return function (classConstructor: any) {
        classConstructor[symbols.dbTable] = table;
        
        var schemaMap: Map<string, any> = classConstructor.prototype[symbols.dbSchema];
        classConstructor[symbols.dbSchema] = Object.assign({},
            schemaMap.get(AbstractModel.name), schemaMap.get(classConstructor.name));

        classConstructor[symbols.idGenerator] = idGenerator;
       
        classConstructor[symbols.arrayComparator] = arrayComparison === ArrayComparison.strict 
            ? compareArraysStrict : compareArraysAsSets;
    }
}

export function dbField(fieldType: any, readonly?: boolean): PropertyDecorator {
    return function (classPrototype: any, property: string) {
        var field = new DbField(property, fieldType, readonly);
        
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
        schema[property] = field;
    }
}