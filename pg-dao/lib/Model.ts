// IMPORTS
// ================================================================================================
import * as assert from 'assert';

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

export enum ModelState {
    synchronized = 1,
    modified,
    created,
    destroyed,
    invalid
}

export interface ModelHandler<T extends Model> extends ResultHandler<T> {
    id: symbol;
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
    assert(handler, 'Model handler is undefined');
    assert(isModelHandler(handler), 'Model handler is invalid');
    return handler;
}

export function isModelHandler(handler: any): boolean {
    return (handler !== undefined)
        && (typeof handler.id === 'symbol')        
        && (typeof handler.getSyncQueries === 'function');
}