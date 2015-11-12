// IMPORTS
// ================================================================================================
import { Database, Connection, ConnectionOptions, Query, DbQueryResult, ConnectionState, utils } from 'pg-io';
import { Store, SyncInfo, Options as StoreOptions } from './Store';
import { Model, isModelHandler, ModelHandler, symHandler, isModelQuery, ModelQuery } from './Model';
import { ModelError, ModelQueryError, SyncError } from './errors';
import { PgError, ConnectionError } from 'pg-io';

// DAO CLASS DEFINITION
// ================================================================================================
export class Dao extends Connection {
	
	private store: Store;
	
	// CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
	constructor(database: Database, options: ConnectionOptions) {
		super(database, options);
		this.store = new Store(options);
	}
	
	// PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
	get isSynchronized(): boolean {
        return (this.store.hasChanges === false);
    }
	
    // FETCH METHODS
    // --------------------------------------------------------------------------------------------
    fetchOne<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate = false): Promise<T> {
        if(this.isActive === false)
            return <any> Promise.reject(
                new ConnectionError('Cannot fetch a model: connection has already been released'));
                
        if (isModelHandler(handler) === false)
            return <any> Promise.reject(
                new ModelError('Cannot fetch a model: model handler is invalid'));
        
        try {    
            var query = handler.getFetchOneQuery(selector, forUpdate);
        }
        catch (error) {
            return <any> Promise.reject(error);    
        }
        
        if (query === undefined)
            return <any> Promise.reject(
                new ModelQueryError(`Cannot fetch a model: fetch query for selector (${selector}) was not found`));
            
        if (isModelQuery(query) === false)
            return <any> Promise.reject(
                new ModelQueryError(`Cannot fetch a model: fetch query is not a model query`));
            
        if (query.mask !== 'object') 
            return <any> Promise.reject(
                new ModelQueryError(`Cannot fetch a model: fetch query is not a single result query`));
            
        if (query.mutable !== forUpdate)
            return <any> Promise.reject(
                new ModelQueryError(`Cannot fetch a model: fetch query mutable flag is not set correctly`));
            
        return this.execute(query);
    }
    
    fetchAll<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate = false): Promise<T[]> {
        if(this.isActive === false)
            return <any> Promise.reject(
                new ConnectionError('Cannot fetch models: connection has already been released'));
                
        if (isModelHandler(handler) === false)
            return <any> Promise.reject(
                new ModelError('Cannot fetch models: model handler is invalid'));
        
        try {
            var query = handler.getFetchAllQuery(selector, forUpdate);
        }
        catch (error) {
            return <any> Promise.reject(error);    
        }
        
        if (query === undefined)
            return <any> Promise.reject(
                new ModelQueryError(`Cannot fetch models: fetch query for selector (${selector}) was not found`));
            
        if (isModelQuery(query) === false)
            return <any> Promise.reject(
                new ModelQueryError(`Cannot fetch models: fetch query is not a model query`));
            
        if (query.mask !== 'list') 
            return <any> Promise.reject(
                new ModelQueryError(`Cannot fetch models: fetch query is not a list result query`));
            
        if (query.mutable !== forUpdate)
            return <any> Promise.reject(
                new ModelQueryError(`Cannot fetch models: fetch query mutable flag is not set correctly`));
            
        return this.execute(query);
    }
    
	// LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
	sync(): Promise<SyncInfo[]> {
        if(this.isActive === false)
            return <any> Promise.reject(
                new ConnectionError('Cannot sync: connection has already been released'));

        var start = process.hrtime();
        this.log && this.log('Synchronizing Dao');
       
        var changes: SyncInfo[]; 
        return Promise.resolve().then(() => {
            changes = this.store.getChanges();
            return this.getModelSyncQueries(changes);
        })
        .catch((reason) => this.rollbackAndRelease(reason))
        .then((queries) => {
            if (queries.length === 0) {
                this.log && this.log(`No changes detected in ${utils.since(start)} ms`);
                return Promise.resolve(changes);
            }
            
            return this.execute(queries).then(() => {
                this.store.applyChanges(changes);
                this.log && this.log(`Synchronized ${changes.length} changes in ${utils.since(start)} ms`);
                return changes;
            });          
        }).catch((reason) => {
            if (reason instanceof SyncError)
                reason = new SyncError('DAO Sync failed', reason);
            return Promise.reject(reason);
        });
    }
        
	// OVERRIDEN CONNECTION METHODS
    // --------------------------------------------------------------------------------------------
    release(action?: string): Promise<any> {
        if(this.isActive === false)
            return Promise.reject(
                new ConnectionError('Cannot release connection: connection has already been released'));
        
        var start = process.hrtime();
        try {
            this.log && this.log('Preparing to release Dao connection; checking for changes');
            var changes = this.store.getChanges();
            this.log && this.log(`Found ${changes.length} changes in ${utils.since(start)} ms`);
        }
        catch (error) {
            return  this.rollbackAndRelease(error);
        }
        
        if (changes.length === 0)
            return super.release(action);
        
        start = process.hrtime();
        switch (action) {
            case 'commit':
                this.log && this.log('Committing transaction and releasing connection back to the pool');
                var queries = this.getModelSyncQueries(changes, true);
                return this.execute(queries).then(() => {
                    changes = this.store.applyChanges(changes);
                    this.releaseConnection();
                    this.log && this.log(`Transaction committed in ${utils.since(start)} ms; pool state: ${this.database.getPoolDescription()}`);
                    return changes; 
                });
            case 'rollback':
                this.log && this.log('Rolling back transaction and releasing connection back to the pool');
                return this.rollbackAndRelease()
                    .then((result) => {
                        this.log && this.log(`Transaction rolled back in ${utils.since(start)} ms; pool state: ${this.database.getPoolDescription()}`);
                        return result;
                    });
            default:
                return this.rollbackAndRelease(
                    new SyncError('Unsynchronized models detected during connection release'));
           }
	}
    
	protected processQueryResult(query: Query, result: DbQueryResult): any[] {
        if (isModelQuery(query)) {
            var handler = query.handler;
            return this.store.load(handler, result.rows, query.mutable);
        }
        else {
            return super.processQueryResult(query, result);
        }
	}
    
    // CREATE METHODS
    // --------------------------------------------------------------------------------------------
    create<T extends Model>(handler: ModelHandler<T>, attributes: any): Promise<T> {
        if(this.isActive === false)
            throw <any> Promise.reject(
                new ConnectionError('Cannot create a model: connection has already been released'));
        
        var start = process.hrtime();
        this.log && this.log(`Creating a new ${handler.name || 'Unnamed'} model`);
        if (isModelHandler(handler) === false)
            return <any> Promise.reject(
                new ModelError('Cannot create a model: model handler is invalid'));
        
        var idGenerator = handler.getIdGenerator();
        if (!idGenerator)
            return <any> Promise.reject(
                new ModelError('Cannot create a model: model id generator is undefined'));
        
        return idGenerator.getNextId(this).then((nextId) => {
            var model = handler.build(nextId, attributes);
            this.log && this.log(`New ${handler.name || 'Unnamed'} model created in ${utils.since(start)} ms`);
            return model;
        });
    }
    
    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    insert(model: Model) : Model {
        if(this.isActive === false)
            throw new ConnectionError('Cannot insert a model: connection has already been released'); 
        return this.store.insert(model); 
    }
    
    destroy(model: Model): Model {
        if(this.isActive === false)
            throw new ConnectionError('Cannot destroy a model: connection has already been released'); 
        return this.store.destroy(model); 
    }
    
    clean(model: Model): Model {
        if(this.isActive === false)
            throw new ConnectionError('Cannot clean a model: connection has already been released'); 
        return this.store.clean(model); 
    }

    hasModel(model: Model)      : boolean { return this.store.has(model); }

    isNew(model: Model)         : boolean { return this.store.isNew(model); }
    isDestroyed(model: Model)   : boolean { return this.store.isDestroyed(model); }
    isModified(model: Model)    : boolean { return this.store.isModified(model); }
    isMutable(model: Model)     : boolean { return this.store.isMutable(model); }
    
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    getModelSyncQueries(changes: SyncInfo[], commit = false) {
        var queries: Query[] = [];
        for (var i = 0; i < changes.length; i++) {
            let original = changes[i].original;
            let current = changes[i].current;
            
            if (this.options.manageUpdatedOn && original !== undefined && current !== undefined) {
                current.updatedOn = new Date();
            }
            var handler: ModelHandler<any> = current ? current[symHandler] : original[symHandler];
            queries = queries.concat(handler.getSyncQueries(original, current)); 
        }
        
        if (commit) {
            if (queries.length > 0 || this.state === ConnectionState.transaction) {
                queries.push(COMMIT_TRANSACTION);
            }
        }
        return queries;
    }
}

// COMMON QUERIES
// ================================================================================================
var BEGIN_TRANSACTION: Query = {
    name: 'qBeginTransaction',
    text: 'BEGIN;'
};

var COMMIT_TRANSACTION: Query = {
    name: 'qCommitTransaction',
    text: 'COMMIT;'
};

var ROLLBACK_TRANSACTION: Query = {
    name: 'qRollbackTransaction',
    text: 'ROLLBACK;'
};