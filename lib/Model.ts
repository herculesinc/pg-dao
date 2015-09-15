// IMPORTS
// ================================================================================================
import { ResultHandler, Query, ResultQuery  } from 'pg-io';

// MODULE VARIABLES
// ================================================================================================
export var symHandler = Symbol();

// ENUMS A ND INTERFACES
// ================================================================================================
export interface Model {
    id          : number;
    updatedOn   : Date;
    createdOn   : Date;
}

export interface ModelHandler<T extends Model> extends ResultHandler<T> {
    clone(model: T): T;
    infuse(target: T, source: T);
    areEqual(model1: T, model2: T): boolean;
    getSyncQueries(original: T, current: T): Query[];
    getFetchOneQuery(selector: any, forUpdate: boolean): ModelQuery<T>;
    getFetchAllQuery(selector: any, forUpdate: boolean): ModelQuery<T>;
}

export interface ModelQuery<T extends Model> extends ResultQuery<T> {
    handler : ModelHandler<T>;
    mutable?: boolean;
}

// PUBLIC FUNCTIONS
// ================================================================================================
export function isModel(model: any): model is Model {
    return (typeof model.id === 'number')
        && (isModelHandler(model[symHandler]));
}

export function getModelHandler(model: Model): ModelHandler<any> {
    var handler = model[symHandler];
    return isModelHandler(handler) ? handler : undefined;
}

export function isModelHandler(handler: any): handler is ModelHandler<any> {
    return (handler !== undefined)     
        && (typeof handler.clone === 'function')
        && (typeof handler.infuse === 'function')
        && (typeof handler.areEqual === 'function')
        && (typeof handler.getSyncQueries === 'function')
        && (typeof handler.getFetchOneQuery === 'function')
        && (typeof handler.getFetchAllQuery === 'function');
}

export function isModelQuery(query: Query): query is ModelQuery<any> {
    return ('handler' in query && isModelHandler(query['handler']));
}