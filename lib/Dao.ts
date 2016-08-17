// IMPORTS
// ================================================================================================
import { Database, Session, SessionOptions, Query, DbQueryResult, TransactionState, Logger, util } from 'pg-io';
import { Store, SyncInfo, Options as StoreOptions } from './Store';
import { Model, isModelHandler, ModelHandler, symHandler, isModelQuery, ModelQuery } from './Model';
import { ModelError, ModelQueryError, SyncError } from './errors';
import { PgError, ConnectionError } from 'pg-io';

// MODULE VARIABLES
// ================================================================================================
const since = util.since;

// DAO CLASS DEFINITION
// ================================================================================================
export class Dao extends Session {
	
	private store: Store;
	
	// CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
	constructor(dbName: string, client: any, options: SessionOptions, logger?: Logger) {
		super(dbName, client, options, logger);
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
        if(!this.isActive) {
            return Promise.reject(new ConnectionError('Cannot fetch a model: session has already been closed'));
        }

        if (!isModelHandler(handler)) {
            return Promise.reject(new ModelError('Cannot fetch a model: model handler is invalid'));
        }
        
        try {    
            var query = handler.getFetchOneQuery(selector, forUpdate);
        }
        catch (error) {
            return Promise.reject(error);    
        }
        
        if (!query) {
            return Promise.reject(new ModelQueryError(`Cannot fetch a model: fetch query for selector (${selector}) was not found`));
        }
            
        if (!isModelQuery(query)) {
            return Promise.reject(new ModelQueryError(`Cannot fetch a model: fetch query is not a model query`));
        }
            
        if (query.mask !== 'object') {
            return Promise.reject(new ModelQueryError(`Cannot fetch a model: fetch query is not a single result query`));
        }
            
        if (query.mutable !== forUpdate) {
            return Promise.reject(new ModelQueryError(`Cannot fetch a model: fetch query mutable flag is not set correctly`));
        }
            
        return this.execute(query);
    }
    
    fetchAll<T extends Model>(handler: ModelHandler<T>, selector: any, forUpdate = false): Promise<T[]> {
        if(!this.isActive) {
            return Promise.reject(new ConnectionError('Cannot fetch models: session has already been closed'));
        }
    
        if (!isModelHandler(handler)) {
            return Promise.reject(new ModelError('Cannot fetch models: model handler is invalid'));
        }

        try {    
            var query = handler.getFetchAllQuery(selector, forUpdate);
        }
        catch (error) {
            return Promise.reject(error);    
        }

        if (!query) {
            return Promise.reject(new ModelQueryError(`Cannot fetch models: fetch query for selector (${selector}) was not found`));
        }
            
        if (!isModelQuery(query)) {
            return Promise.reject(new ModelQueryError(`Cannot fetch models: fetch query is not a model query`));
        }
            
        if (query.mask !== 'list') {
            return Promise.reject(new ModelQueryError(`Cannot fetch models: fetch query is not a list result query`));
        }

        if (query.mutable !== forUpdate) {
            return Promise.reject(new ModelQueryError(`Cannot fetch models: fetch query mutable flag is not set correctly`));
        }

        return this.execute(query);
    }
    
	// LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
	sync(): Promise<void> {
        if(this.isActive === false) {
            return Promise.reject(new ConnectionError('Cannot sync: session has already been closed'));
        }

        this.logger && this.logger.debug('Preparing to sync; checking for changes');
        const start = process.hrtime();
        try {
            var changes = this.store.getChanges();
            if (!changes.length) {
                this.logger && this.logger.debug(`No changes detected in ${since(start)} ms`);
                return Promise.resolve();
            }
            else {
                this.logger && this.logger.debug(`Found ${changes.length} changes in ${since(start)} ms`);
                var syncQueries = this.getModelSyncQueries(changes);
            }
        }
        catch (error) {
            return this.rollbackAndRelease(error);
        }

        return this.execute(syncQueries).then(() => {
            this.store.applyChanges(changes);
            this.logger && this.logger.debug(`Synchronized ${changes.length} changes in ${since(start)} ms`);
        })
    }
        
	// OVERRIDEN SESSION METHODS
    // --------------------------------------------------------------------------------------------
    close(action?: 'commit' | 'rollback'): Promise<any> {
        if(!this.isActive) {
            return Promise.reject(new ConnectionError('Cannot close session: session has already been closed'));
        }

        // delegate rollbacks to the super
        if (action === 'rollback') return super.close(action);

        this.logger && this.logger.debug('Preparing to close session; checking for changes');
        const start = process.hrtime();
        try {
            var changes = this.store.getChanges();
            if (!changes.length) {
                this.logger && this.logger.debug(`No changes detected in ${since(start)} ms`);
                return super.close(action);
            }
            else {
                this.logger && this.logger.debug(`Found ${changes.length} changes in ${since(start)} ms`);
                if (action !== 'commit') {
                    throw new SyncError('Unsynchronized models detected during session close');
                }
                var syncQueries = this.getModelSyncQueries(changes);
            }
        }
        catch (error) {
            return this.rollbackAndRelease(error);
        }
        
        this.logger && this.logger.debug('Committing transaction and closing the session');        
        return this.execute(syncQueries).then(() => {
            this.store.clear();
            this.releaseConnection();
        });
	}
    
	protected processQueryResult(query: Query, result: DbQueryResult): any[] {
        if (isModelQuery(query)) {
            const handler = query.handler;
            return this.store.load(handler, result.rows, query.mutable);
        }
        else {
            return super.processQueryResult(query, result);
        }
	}
    
    // CREATE METHODS
    // --------------------------------------------------------------------------------------------
    create<T extends Model>(handler: ModelHandler<T>, attributes: any): Promise<T> {
        if(!this.isActive) {
            throw Promise.reject(new ConnectionError('Cannot create a model: session has already been closed'));
        }
        
        const start = process.hrtime();
        this.logger && this.logger.debug(`Creating a new ${handler.name || 'Unnamed'} model`);
        if (!isModelHandler(handler)) {
            return Promise.reject(new ModelError('Cannot create a model: model handler is invalid'));
        }

        const idGenerator = handler.getIdGenerator();
        if (!idGenerator) {
            return Promise.reject(new ModelError('Cannot create a model: model id generator is undefined'));
        }
            
        return idGenerator.getNextId(this).then((nextId) => {
            const model = handler.build(nextId, attributes);
            this.logger && this.logger.debug(`New ${handler.name || 'Unnamed'} model created in ${since(start)} ms`);
            return model;
        });
    }
    
    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    insert(model: Model) : Model {
        if(!this.isActive) {
            throw new ConnectionError('Cannot insert a model: session has already been closed');
        }
        return this.store.insert(model); 
    }
    
    destroy(model: Model): Model {
        if(!this.isActive) {
            throw new ConnectionError('Cannot destroy a model: session has already been closed');
        } 
        return this.store.destroy(model); 
    }
    
    clean(model: Model): Model {
        if(!this.isActive) {
            throw new ConnectionError('Cannot clean a model: session has already been closed');
        }
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
        const timestamp = new Date();
        
        let queries: Query[] = [];
        for (let [ original, current, updates ] of changes) {            
            if (this.options.manageUpdatedOn && original && current) {
                current.updatedOn = timestamp;
            }
            const handler: ModelHandler<any> = current ? current[symHandler] : original[symHandler];
            queries = queries.concat(handler.getSyncQueries(original, current, updates)); 
        }
        
        if (commit) {
            queries.push(COMMIT_TRANSACTION);
        }
        return queries;
    }
}

// COMMON QUERIES
// ================================================================================================
const COMMIT_TRANSACTION: Query = {
    name: 'qCommitTransaction',
    text: 'COMMIT;'
};