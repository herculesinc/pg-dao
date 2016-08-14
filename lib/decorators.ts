// IMPORTS 
// ================================================================================================
import { AbstractModel, symbols } from './AbstractModel';
import { IdGenerator } from './Model'
import { ModelError } from './errors';
import { DbField } from './schema';
import { Comparator, Cloner} from './util';

// INTERFACES
// ================================================================================================
export const enum ArrayComparison {
    strict = 1, set
}

export interface dbFieldOptions {
    readonly?   : boolean;
    secret?     : string;
    cloner?     : Cloner<any>;
    comparator? : Comparator;
}

// DECORATOR DEFINITIONS
// ================================================================================================
export function dbModel(table: string, idGenerator: IdGenerator): ClassDecorator {
    if (table == undefined || table.trim() === '')
        throw new ModelError('Model table name cannot be empty');
        
    if (!idGenerator) throw new ModelError('Model ID generator cannot be empty');
    
    return function (classConstructor: any) {
        classConstructor[symbols.dbTable] = table;
        
        const schemaMap: Map<string, any> = classConstructor.prototype[symbols.dbSchema];
        classConstructor[symbols.dbSchema] = Object.assign({},
            schemaMap.get(AbstractModel.name), schemaMap.get(classConstructor.name));

        classConstructor[symbols.idGenerator] = idGenerator;
    }
}

export function dbField(fieldType: any, options?: dbFieldOptions): PropertyDecorator {
    // make sure options are set
    options = Object.assign({ readonly: false }, options);

    return function (classPrototype: any, property: string) {
        const field = new DbField(property, fieldType, 
            options.readonly, options.secret, options.cloner, options.comparator);
        
        let schemaMap: Map<string, any> = classPrototype[symbols.dbSchema];
        if (!schemaMap) {
            schemaMap = new Map<string, any>();
            classPrototype[symbols.dbSchema] = schemaMap; 
        }
        
        let schema = schemaMap.get(classPrototype.constructor.name);
        if (!schema) {
            schema = {};
            schemaMap.set(classPrototype.constructor.name, schema);
        }
        schema[property] = field;
    }
}