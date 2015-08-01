declare module "pg-dao" {

    // CONNECTION
    // --------------------------------------------------------------------------------------------
    export interface ConnectionSettings {
        host        : string;
        port?       : number;
        user        : string;
        password    : string;
        database    : string;
        poolSize?   : number;
    }

    export function connect(settings: ConnectionSettings): Promise<Dao>;
    
    export var symbols: {
        handler: symbol;
    };

    // DAO DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface Dao {
        isActive        : boolean;
        inTransaction   : boolean;
        isSynchronized  : boolean;

        startTransaction()      : Promise<void>;
        sync(commit?: boolean)  : Promise<SyncInfo[]>;
        release()               : Promise<void>;

        execute<T>(query: ResultQuery<T>)   : Promise<T[]>
        execute(query: Query)               : Promise<void>
        execute(queries: Query[])           : Promise<any>;

        save(model: Model, setUpdatedOn?: boolean): boolean;
        destroy(model: Model);

        isRegistered(model: Model)  : boolean;
        getModelState(model: Model) : ModelState;
        isSaved(model: Model)       : boolean;
    }

    export interface SyncInfo {
        original: Model;
        saved: Model;
    }

    // MODEL DEFINITIONS
    // --------------------------------------------------------------------------------------------
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

    // RESULT HANDLER DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export interface ResultHandler<T> {
        parse(row: any): T;
    }

    export interface ModelHandler<T extends Model> extends ResultHandler<T> {
        id: symbol;
        getSyncQueries: (original: T, current: T) => Query[];
    }

    // QUERY DEFINITIONS
    // --------------------------------------------------------------------------------------------
    export enum ResultMask {
        list = 1
    }

    export interface Query {
        text: string;
        name?: string;
    }
    
    export interface ResultQuery<T> extends Query {
        mask: ResultMask;
        handler?: ResultHandler<T>;
    }

    export interface ModelQuery<T extends Model> extends ResultQuery<T> {
        handler: ModelHandler<T>;
        mutableModels?: boolean;
    }
}