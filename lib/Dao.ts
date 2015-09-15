// IMPORTS
// ================================================================================================
import { Connection, ConnectionOptions, Query, DbQueryResult, ConnectionState } from 'pg-io';
import { Store, SyncInfo, Options as StoreOptions } from './Store';
import { Model, ModelHandler, symHandler, isModelQuery, ModelQuery } from './Model';

// DAO CLASS DEFINITION
// ================================================================================================
export class Dao extends Connection {
	
	private store: Store;
	
	// CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
	constructor(options: ConnectionOptions, client: any, done: (error?: Error) => void) {
		super(options, client, done);
		this.store = new Store(options);
	}
	
	// PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
	get isSynchronized(): boolean {
        return (this.store.hasChanges === false);
    }
	
	// LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
	sync(): Promise<SyncInfo[]> {
        if(this.isActive === false)
            return Promise.reject(new Error('Cannot snyc: Dao is currently not active'));

        var changes: SyncInfo[];
        
        return Promise.resolve().then(() => {
            changes = this.store.getChanges();
            return this.getModelSyncQueries(changes);
        })
        .catch((reason) => this.rollbackAndRelease(reason))
        .then((queries) => {
            if (queries.length === 0) return Promise.resolve(changes);
            
            return this.execute(queries).then(() => {
                this.store.applyChanges(changes);
                return changes;
            });          
        }).catch((reason) => Promise.reject(new Error(`Sync failed: ${reason.message}`)));
    }
        
	// OVERRIDEN CONNECTION METHODS
    // --------------------------------------------------------------------------------------------
    release(action?: string): Promise<any> {
        if(this.isActive === false)
            return Promise.reject(new Error('Cannot sync: Dao is currently not active'));
        
        try {
            var changes = this.store.getChanges();
        }
        catch (error) {
            return Promise.reject(error);
        }
        
        if (changes.length === 0)
            return super.release(action);
        
        switch (action) {
            case 'commit':
                var queries = this.getModelSyncQueries(changes, true);
                return this.execute(queries).then(() => {
                    this.store.applyChanges(changes);
                    this.releaseConnection();
                    return changes; 
                });
            case 'rollback':
                return this.rollbackAndRelease()
                    .then(() => this.store.cleanChanges());
            default:
                return this.rollbackAndRelease(
                    new Error('Unsynchronized models detected during connection release'));
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
    
    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    insert(model: Model)        : Model { return this.store.insert(model); }
    destroy(model: Model)       : Model { return this.store.destroy(model); }
    clean(model: Model)         : Model { return this.store.clean(model); }

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
    text: 'BEGIN;'
};

var COMMIT_TRANSACTION: Query = {
    text: 'COMMIT;'
};

var ROLLBACK_TRANSACTION: Query = {
    text: 'ROLLBACK;'
};