// IMPORTS 
// ================================================================================================
import { AbstractModel, symbols } from './AbstractModel';
import { IdGenerator } from './Model'
import { ModelError } from './errors';
import { DbField, FieldHandler } from './schema';
import { Comparator, Cloner} from './util';

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
    if (table == undefined || table.trim() === '')
        throw new ModelError('Model table name cannot be empty');
        
    if (!idGenerator) throw new ModelError('Model ID generator cannot be empty');
    
    return function (classConstructor: any) {
        
        const schemaMap: Map<string, any> = classConstructor.prototype[symbols.dbFields];
        const fields = Object.assign({},
            schemaMap.get(AbstractModel.name), schemaMap.get(classConstructor.name));

        const fieldMap: Map<string, DbField> = new Map();
        const secretFieldMap: Map<string, DbField> = new Map();
        for (let fieldName in fields) {
            let field: DbField = fields[fieldName];
            fieldMap.set(fieldName, field);
            if (field.secret) {
                secretFieldMap.set(fieldName, field);
            }
        }

        classConstructor[symbols.dbSchema] = {
            tableName	: table,
            idGenerator	: idGenerator,
            fields		: fieldMap,
            secretFields: secretFieldMap
        };
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