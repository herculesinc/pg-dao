declare module "pg-dao" {

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

        execute<T>(query: ResultQuery<T>)   : Promise<any>;
        execute(query: Query)               : Promise<void>;
        execute(queries: Query[])           : Promise<Map<string,any>>;

        insert<T extends Model>(model: T)   : T;
        destroy<T extends Model>(model: T)  : T;
        clean<T extends Model>(model: T)    : T;

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

    // RESULT HANDLER DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface ResultHandler<T> {
        parse(row: any): T;
    }

    export interface ModelHandler<T extends Model> extends ResultHandler<T> {
        clone(model: T): T;
        infuse(target: T, source: T);
        areEqual(model1: T, model2: T): boolean;
        getSyncQueries(original: T, current: T): Query[];
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
        handler: ModelHandler<T>;
        mutable?: boolean;
    }
}