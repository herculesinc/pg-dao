// IMPORTS
// ================================================================================================
import { ResultHandler, Query  } from './Query';

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
    clone: (model: T) => T;
    areEqual: (model1: T, model2: T) => boolean;
    getSyncQueries: (original: T, current: T) => Query[];
}

// PUBLIC FUNCTIONS
// ================================================================================================
export function isModel(model: any): boolean {
    return (typeof model.id === 'number')
        && (isModelHandler(model[symHandler]));
}

export function getModelHandler(model: Model): ModelHandler<any> {
    var handler = model[symHandler];
    return isModelHandler(handler) ? handler : undefined;
}

export function isModelHandler(handler: any): boolean {
    return (handler !== undefined)     
        && (typeof handler.clone === 'function')
        && (typeof handler.areEqual === 'function')
        && (typeof handler.getSyncQueries === 'function');
}