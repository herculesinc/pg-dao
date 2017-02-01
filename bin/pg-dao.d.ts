declare module "pg-dao" {

    // IMPORTS
    // --------------------------------------------------------------------------------------------
    import * as events from 'events';

    // GLOBAL
    // --------------------------------------------------------------------------------------------
    export interface DatabaseOptions {
        name?           : string;
        pool?           : PoolOptions;
        session?        : DaoOptions;
        connection      : ConnectionSettings;
    }

    export interface ConnectionSettings {
        host            : string;
        port?           : number;
        ssl?            : boolean;
        user            : string;
        password        : string;
        database        : string;
    }
    
    export interface PoolOptions {
        maxSize?        : number;
        idleTimeout?    : number;
        reapInterval?   : number;
    }

    export const defaults: {
        name            : string;
        connection      : ConnectionSettings;
        session         : DaoOptions;
        pool            : PoolOptions;
    };

    export const symbols: {
        handler         : symbol;
        dbSchema        : symbol;
    };

    // DATABASE
    // --------------------------------------------------------------------------------------------
    export interface DaoOptions {
        collapseQueries?        : boolean;
        startTransaction?       : boolean;
        logQueryText?           : boolean;
        validateImmutability?   : boolean;
        manageUpdatedOn?        : boolean;
    }

    export interface PoolState {
        size                    : number;
        available               : number;
    }

    export class Database extends events.EventEmitter {

        name: string;

        constructor(options: DatabaseOptions, logger?: Logger);

        connect(options?: DaoOptions): Promise<Dao>;
        close(): Promise<any>;

        getPoolState(): PoolState;

        on(event: 'error', callback: (error: PgError) => void);
    }

    // DAO DEFINITION
    // --------------------------------------------------------------------------------------------
    export interface Dao {

        isActive        : boolean;
        inTransaction   : boolean;
        isSynchronized  : boolean;

        startTransaction(lazy?: boolean)        : Promise<void>;
        sync()                                  : Promise<void>;
        close(action?: 'commit' | 'rollback')   : Promise<void>;
        
        execute<T>(query: SingleResultQuery<T>) : Promise<T>
        execute<T>(query: ListResultQuery<T>)   : Promise<T[]>
        execute<T>(query: ResultQuery<T>)       : Promise<any>
        execute(query: Query)                   : Promise<void>;
        execute(queries: Query[])               : Promise<Map<string, any>>;

        fetchOne<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate?: boolean): Promise<T>;
        fetchAll<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate?: boolean): Promise<T[]>;

        create<T extends Model>(handler: ModelHandler<T>, attributes: any): Promise<T>;
        load<T extends Model>(handler: ModelHandler<T>, seed: any): T;

        insert<T extends Model>(model: T)   : T;
        destroy<T extends Model>(model: T)  : T;
        clean<T extends Model>(model: T)    : T;

        hasModel(model: Model): boolean;
        getModel<T extends Model>(handler: ModelHandler<T>, id: string): T;

        isNew(model: Model)                 : boolean;
        isDestroyed(model: Model)           : boolean;
        isModified(model: Model)            : boolean;
        isMutable(model: Model)             : boolean;

        getChanges(model: Model)            : string[];
    }

    // CUSTOM TYPES
    // --------------------------------------------------------------------------------------------
    export type Timestamp = number;
    export namespace Timestamp {
        export function parse(value: any): Timestamp;
    }

    // MODEL DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface Model {
        id          : string;
        updatedOn   : number;
        createdOn   : number;
    }

    export interface FieldMap {
	    [name: string]: FieldConfig;
    }

    export interface FieldConfig {
        type		: any;
        readonly?	: boolean;
        secret?		: string;
        handler?	: FieldHandler;
    }

    export class AbstractModel implements Model {
        id          : string;
        updatedOn   : number;
        createdOn   : number;
        
        protected constructor(seed: any, deepCopy?: boolean);
        
        static name: string;

        static parse(row: any)                      : any;
        static build(id: string, attributes: any)   : any;
        static clone(model: Model)                  : any;
        static infuse(target: Model, source: Model) : void;

        static compare(original: AbstractModel, current: AbstractModel) : string[];
        static areEqual(model1: AbstractModel, model2: AbstractModel)   : boolean;

        static getSyncQueries(original: AbstractModel, current: AbstractModel, changes?: string[]): Query[];
        static getFetchOneQuery(selector: any, forUpdate: boolean, name?: string): ModelQuery<any>;
        static getFetchAllQuery(selector: any, forUpdate: boolean, name?: string): ModelQuery<any>;

        static getIdGenerator(): IdGenerator;

        static setSchema(tableName: string, idGenerator: IdGenerator, fields: FieldMap);
        static getFieldSelectors(): string[];
        static getFieldSelectorString(): string;
    }
    
    // DECORATORS
    // --------------------------------------------------------------------------------------------
    export function dbModel(table: string, idGenerator: IdGenerator): ClassDecorator;
    export function dbField(fieldType: any, options?: dbFieldOptions): PropertyDecorator;

    export interface dbFieldOptions {
        readonly?   : boolean;
        secret?     : string;
        handler?    : FieldHandler;
    }

    export interface FieldHandler {
        clone       : (value: any) => any;
        areEqual    : (value1: any, value2: any) => boolean;
    }

    // RESULT/MODEL HANDLER DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface ResultHandler<T> {
        parse(row: any): T;
    }

    export interface ModelHandler<T extends Model> extends ResultHandler<T> {
        name?: string;

        build(id: string, attributes: any): T;
        clone(model: T): T;
        infuse(target: T, source: T);
        
        compare(original: T, current: T): string[];
        areEqual(model1: T, model2: T): boolean;

        getSyncQueries(original: T, current: T): Query[];
        getFetchOneQuery(selector: any, forUpdate: boolean, name?: string): ModelQuery<T>;
        getFetchAllQuery(selector: any, forUpdate: boolean, name?: string): ModelQuery<T>;
        
        getIdGenerator(): IdGenerator;
    }
    
    // ID GENERATORS
    // --------------------------------------------------------------------------------------------
    export interface IdGenerator {
        getNextId(connection?: Dao): Promise<string>;
    }
    
    export class PgIdGenerator implements IdGenerator {
        idSequenceQuery: ResultQuery<string>;
        constructor(idSequence: string);
        getNextId(dao: Dao): Promise<string>;
    }
        
    // QUERY DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export type QueryMask = 'list' | 'single';
    export type QueryMode = 'object' | 'array';

    export interface QuerySpec {
        text    : string;
        name?   : string;
    }

    export interface Query extends QuerySpec {
        params? : any;
    }

    export interface ResultQuery<T> extends Query {
        mask    : QueryMask;
        mode?   : QueryMode;
        handler?: ResultHandler<T>;
    }

    export interface SingleResultQuery<T> extends ResultQuery<T> {
        mask    : 'single';
    }

    export interface ListResultQuery<T> extends ResultQuery<T> {
        mask    : 'list';
    }

    export class AbstractActionQuery implements Query {
        name    : string;
        text    : string;
        params  : any;
    
        constructor(name?: string, params?: any);
    }

    export interface ModelQuery<T extends Model> extends ResultQuery<T> {
        mode    : 'array';
        handler : ModelHandler<T>;
        mutable?: boolean;
    }

    export interface SingleModelQuery<T extends Model> extends SingleResultQuery<T> {
        mode    : 'array';
        handler : ModelHandler<T>;
        mutable?: boolean;
    }

    export interface ListModelQuery<T extends Model> extends ListResultQuery<T> {
        mode    : 'array';
        handler : ModelHandler<T>;
        mutable?: boolean;
    }

    export class AbstractModelQuery<T extends Model> implements ModelQuery<T> {
        name    : string;
        mode    : 'array';
        mask    : QueryMask;
        mutable : boolean;
        handler : ModelHandler<any>;
        text    : string;
        params  : any;
    
        constructor(handler: ModelHandler<T>, mask: QueryMask, mutable?: boolean);
    }
    
    // ERROR CLASSES
    // --------------------------------------------------------------------------------------------
    export class PgError extends Error {
        cause: Error;
        
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

    // LOGGER
    // --------------------------------------------------------------------------------------------
    export interface Logger {
        debug(message: string, source?: string);
        info(message: string, source?: string);
        warn(message: string, source?: string);
        trace(source: string, command: string, time: number, success?: boolean);
    }
}