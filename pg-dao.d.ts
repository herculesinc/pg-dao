﻿declare module "pg-dao" {

    // GLOBAL
    // --------------------------------------------------------------------------------------------
    export interface ConnectionSettings {
        host        : string;
        port?       : number;
        user        : string;
        password    : string;
        database    : string;
        poolSize?   : number;
    }

    export function db(settings: ConnectionSettings): Database;
    export var defaults: DaoOptions;
    export var symbols: { handler: symbol; };
    
    // DATABASE
    // --------------------------------------------------------------------------------------------
    export interface DaoOptions {
        collapseQueries?        : boolean;
        startTransaction?       : boolean;
        validateImmutability?   : boolean;
        validateHandlerOutput?  : boolean;
        manageUpdatedOn?        : boolean;
    }

    export interface PoolState {
        size        : number;
        available   : number;
    }
    
    export interface Database {
        connect(options?: DaoOptions): Promise<Dao>;
        getPoolState(): PoolState;
    }

    // DAO DEFINITION
    // --------------------------------------------------------------------------------------------
    export interface Dao {
        isActive        : boolean;
        inTransaction   : boolean;
        isSynchronized  : boolean;
        
        startTransaction(lazy?: boolean)    : Promise<void>;
        sync()                              : Promise<SyncInfo[]>;
        
        release(action: 'commit')           : Promise<SyncInfo[]>;
        release(action: 'rollback')         : Promise<void>;
        release(action?: string)            : Promise<any>;

        fetchOne<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate?: boolean): Promise<T>;
        fetchAll<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate?: boolean): Promise<T[]>;

        insert<T extends Model>(model: T)   : T;
        destroy<T extends Model>(model: T)  : T;
        clean<T extends Model>(model: T)    : T;

        execute<T>(query: ResultQuery<T>)   : Promise<any>;
        execute(query: Query)               : Promise<void>;
        execute(queries: Query[])           : Promise<Map<string,any>>;

        hasModel(model: Model)              : boolean;

        isNew(model: Model)                 : boolean;
        isDestroyed(model: Model)           : boolean;
        isModified(model: Model)            : boolean;
        isMutable(model: Model)             : boolean;
    }

    export interface SyncInfo {
        original: Model;
        current : Model;
    }

    // MODEL DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface Model {
        id          : number;
        updatedOn   : Date;
        createdOn   : Date;
    }

    // RESULT/MODEL HANDLER DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface ResultHandler<T> {
        parse(row: any): T;
    }

    export interface ModelHandler<T extends Model> extends ResultHandler<T> {
        clone(model: T): T;
        infuse(target: T, source: T);
        areEqual(model1: T, model2: T): boolean;
        getSyncQueries(original: T, current: T): Query[];
        getFetchOneQuery(selector: any, forUpdate: boolean): ModelQuery<T>;
        getFetchAllQuery(selector: any, forUpdate: boolean): ModelQuery<T>;
    }

    // QUERY DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface Query {
        text    : string;
        name?   : string;
        params? : any;
    }
    
    export interface ResultQuery<T> extends Query {
        mask    : string;
        handler?: ResultHandler<T>;
    }

    export interface ModelQuery<T extends Model> extends ResultQuery<T> {
        handler : ModelHandler<T>;
        mutable?: boolean;
    }
    
    // ERROR CLASSES
    // --------------------------------------------------------------------------------------------
    export class PgError extends Error {
        cause: Error;
        stack: string;
        
        constructor(cause: Error);
	    constructor(message: string, cause?: Error);
    }
	
    export class ConnectionError extends PgError {}
    export class TransactionError extends PgError {}
    export class QueryError extends PgError {}
    export class ParseError extends PgError {}
    export class StoreError extends PgError {}
    export class SyncError extends PgError {}
    export class ModelError extends PgError {}
    export class ModelQueryError extends ModelError {}
}