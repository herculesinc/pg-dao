// IMPORTS
// ================================================================================================
import * as assert from 'assert';
import * as pg from 'pg';

import { Model, ModelHandler, isModelHandler } from './Model';

// ENUMS
// ================================================================================================
export enum ResultType {
    list = 1
}

// INTERFACES
// ================================================================================================
export interface Query {
    text: string;
    name?: string;
}

export interface ResultHandler<T> {
    parse(row: any): T;
}

export interface ResultQuery<T> extends Query {
    type: ResultType;
    handler?: ResultHandler<T>;
}

export interface ModelQuery<T extends Model> extends ResultQuery<T> {
    handler: ModelHandler<T>;
    mutableModels?: boolean;
}