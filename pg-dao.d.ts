declare module "pg-dao" {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import * as pg from 'pg-io';

    export { 
        defaults, DatabaseOptions, PoolState,
        QueryMask, QuerySpec, Query, ResultQuery, SingleResultQuery, ListResultQuery, ResultHandler,
        PgError, ConnectionError, TransactionError, QueryError, ParseError
    } from 'pg-io';

    // GLOBAL
    // --------------------------------------------------------------------------------------------
    export const symbols: {
        handler         : symbol;
        fetchQuery      : symbol;
        updateQuery     : symbol;
        insertQuery     : symbol;
        deleteQuery     : symbol;
        dbTable         : symbol;
        dbSchema        : symbol;
        idGenerator     : symbol;
        arrayComparator : symbol;
    };

    // DATABASE
    // --------------------------------------------------------------------------------------------
    export interface DaoOptions extends pg.SessionOptions {
        validateImmutability?   : boolean;
        manageUpdatedOn?        : boolean;
    }

    export class Database extends pg.Database {
        connect(options?: DaoOptions): Promise<Dao>;
    }

    // DAO DEFINITION
    // --------------------------------------------------------------------------------------------
    export interface Dao extends pg.Session {

        isSynchronized  : boolean;
        sync()          : Promise<void>;

        fetchOne<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate?: boolean): Promise<T>;
        fetchAll<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate?: boolean): Promise<T[]>;

        create<T extends Model>(handler: ModelHandler<T>, attributes: any): Promise<T>;
        
        insert<T extends Model>(model: T)   : T;
        destroy<T extends Model>(model: T)  : T;
        clean<T extends Model>(model: T)    : T;

        hasModel(model: Model)              : boolean;

        isNew(model: Model)                 : boolean;
        isDestroyed(model: Model)           : boolean;
        isModified(model: Model)            : boolean;
        isMutable(model: Model)             : boolean;
    }

    // MODEL DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface Model {
        id          : string;
        updatedOn   : Date;
        createdOn   : Date;
    }
    
    export class AbstractModel implements Model {
        id          : string;
        updatedOn   : Date;
        createdOn   : Date;
        
        constructor(seed: any);
        
        static name: string;

        static parse(row: any): any;
        static build(id: string, attributes: any): Model;
        static clone(seed: any): any;
        static infuse(target: Model, source: Model);

        static compare(original: AbstractModel, current: AbstractModel): string[];
        static areEqual(model1: AbstractModel, model2: AbstractModel): boolean;

        static getSyncQueries(original: AbstractModel, current: AbstractModel): pg.Query[];
        static getFetchOneQuery(selector: any, forUpdate: boolean, name?: string): ModelQuery<any>;
        static getFetchAllQuery(selector: any, forUpdate: boolean, name?: string): ModelQuery<any>;

        static getIdGenerator(): IdGenerator;
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
        clone<T>(value: T): T;
        areEqual(value1: any, value2: any): boolean;
    }

    // RESULT/MODEL HANDLER DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface ModelHandler<T extends Model> extends pg.ResultHandler<T> {
        name?: string;

        build(id: string, attributes: any): T;
        clone(model: T): T;
        infuse(target: T, source: T);
        
        compare(original: T, current: T): string[];
        areEqual(model1: T, model2: T): boolean;

        getSyncQueries(original: T, current: T): pg.Query[];
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
        idSequenceQuery: pg.ResultQuery<string>;
        constructor(idSequence: string);
        getNextId(dao: Dao): Promise<string>;
    }
        
    // QUERY DEFINITIONS
    // --------------------------------------------------------------------------------------------    
    export class AbstractActionQuery implements pg.Query {
        name    : string;
        text    : string;
        params  : any;
    
        constructor(name?: string, params?: any);
    }

    export interface ModelQuery<T extends Model> extends pg.ResultQuery<T> {
        handler : ModelHandler<T>;
        mutable?: boolean;
    }

    export interface SingleModelQuery<T extends Model> extends pg.SingleResultQuery<T> {
        handler : ModelHandler<T>;
        mutable?: boolean;
    }

    export interface ListModelQuery<T extends Model> extends pg.ListResultQuery<T> {
        handler : ModelHandler<T>;
        mutable?: boolean;
    }

    export class AbstractModelQuery<T extends Model> implements ModelQuery<T> {
        name    : string;
        mask    : pg.QueryMask;
        mutable : boolean;
        handler : ModelHandler<any>;
        text    : string;
        params  : any;
    
        constructor(handler: ModelHandler<T>, mask: string, mutable?: boolean);
    }
    
    // ERROR CLASSES
    // --------------------------------------------------------------------------------------------
    export class StoreError extends pg.PgError {}
    export class SyncError extends pg.PgError {}
    export class ModelError extends pg.PgError {}
    export class ModelQueryError extends ModelError {}
}