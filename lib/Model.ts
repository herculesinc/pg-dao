// IMPORTS
// ================================================================================================
import { ResultHandler, Query, ResultQuery } from 'pg-io';
import { Dao } from './Dao';

// MODULE VARIABLES
// ================================================================================================
export var symHandler = Symbol();

// ENUMS A ND INTERFACES
// ================================================================================================
export interface Model {
    id          : string;
    updatedOn   : Date;
    createdOn   : Date;
}

export interface ModelHandler<T extends Model> extends ResultHandler<T> {
    name?: string;
    build(id: string, attributes: any): T;
    clone(model: T): T;
    infuse(target: T, source: T);
    areEqual(model1: T, model2: T): boolean;
    getSyncQueries(original: T, current: T): Query[];
    getFetchOneQuery(selector: any, forUpdate: boolean): ModelQuery<T>;
    getFetchAllQuery(selector: any, forUpdate: boolean): ModelQuery<T>;
    getIdGenerator(): IdGenerator;
}

export interface ModelQuery<T extends Model> extends ResultQuery<T> {
    handler : ModelHandler<T>;
    mutable?: boolean;
}

export interface IdGenerator {
    getNextId(dao?: Dao): Promise<string>;
}

// PUBLIC FUNCTIONS
// ================================================================================================
export function isModel(model: any): model is Model {
    return (typeof model.id === 'string')
        && (isModelHandler(model[symHandler])) as any;
}

export function getModelHandler(model: Model): ModelHandler<any> {
    var handler = model[symHandler];
    return isModelHandler(handler) ? handler : undefined;
}

export function isModelHandler(handler: any): handler is ModelHandler<any> {
    return (handler !== undefined)
        && (typeof handler.build === 'function')     
        && (typeof handler.clone === 'function')
        && (typeof handler.infuse === 'function')
        && (typeof handler.areEqual === 'function')
        && (typeof handler.getSyncQueries === 'function')
        && (typeof handler.getFetchOneQuery === 'function')
        && (typeof handler.getFetchAllQuery === 'function')
        && (typeof handler.getIdGenerator === 'function');
}

export function isModelQuery(query: Query): query is ModelQuery<any> {
    return isModelHandler(query['handler']) as any;
}

// DEFAULT ID GENERATOR
// ================================================================================================
export class PgIdGenerator implements IdGenerator{
    
    idSequenceQuery: ResultQuery<string>;
    
    constructor(idSequence: string) {
        this.idSequenceQuery = {
            name: 'qGetNextId:' + idSequence,
            text: `SELECT nextval('${idSequence}'::regclass) AS id;`,
            mask: 'object',
            handler: {
                parse: (row: any) => row.id
            }
        }
    }
    
    getNextId(dao: Dao): Promise<string> {
        return dao.execute(this.idSequenceQuery);
    }
}