// IMPORTS
// ================================================================================================
import * as debug from 'debug';
import * as assert from 'assert';
import * as pg from 'pg';

import { Query, ResultQuery, ModelQuery, ResultHandler, ResultMask } from './Query';
import { Store, SyncInfo } from './Store';
import { Model, ModelState, ModelHandler, symHandler } from './Model';

// MODULE VARIABLES
// ================================================================================================
var log = debug('pg:dao');

// ENUMS
// ================================================================================================
enum State {
    connection = 1,
    transaction,
    transactionPending,
    released
}

// DAO CLASS DEFINITION
// ================================================================================================
export class Dao {

    private client: pg.Client;
    private done: (error?: Error) => void;
    private state: State;
    private store: Store;
    private pool: pg.ClientPool;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(settings: any, client: pg.Client, done: (error?: Error) => void) {
        this.client = client;
        this.done = done;
        this.state = State.connection;
        this.store = new Store();
        this.pool = pg.pools.getOrCreate(settings);
    }

    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get inTransaction(): boolean {
        return (this.state === State.transaction || this.state === State.transactionPending);
    }

    get isActive(): boolean {
        return (this.state !== State.released);
    }

    get isSynchronized(): boolean {
        return (this.store.hasChanges === false && this.inTransaction === false);
    }
    
    // LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
    startTransaction(): Promise<void> {
        assert(this.isActive,       'Cannot start transaction: Dao is currently not active');
        assert(!this.inTransaction, 'Cannot start transaction: Dao is already in transaction');
        
        log(`Starting transaction`);
        this.state = State.transactionPending;
        return Promise.resolve();
    }

    sync(commit = false): Promise<SyncInfo[]> {
        assert(this.isActive, 'Cannot snyc: Dao is currently not active');
        var state = this.state;
        var changes = this.store.hasChanges ? this.store.getChanges() : [];
        var queries = getSyncQueries(changes);
        log(`Syncing ${changes.length} model(s); Dao is in (${State[this.state]})`);
        
        if (commit) {
            if (queries.length > 0 || this.state === State.transaction) {
                queries.push(COMMIT_TRANSACTION);
            }
            state = State.connection;
        }

        if (queries.length === 0) {
            this.state = state;
            log(`Sync completed; Dao is in (${State[this.state]})`);
            return Promise.resolve(changes);
        }

        return this.execute(queries)
            .then(() => {
                this.state = state;
                this.store.applyChanges();
                log(`Sync completed; Dao is in (${State[this.state]})`);
                return changes;
            }).catch((reason) => {
                log(`Sync failed; Dao is in (${State[this.state]})`);
                return Promise.reject(new Error(`Sync failed: ${reason.message}`));
            });
    }

    release(): Promise<any> {
        assert(this.state !== State.released, 'Cannot release: Dao has already been released');
        
        log(`Releasing Dao back to the pool; Dao is in (${State[this.state]})`);
        return Promise.resolve().then(() => {
            if (this.isSynchronized === false) {
                log(`Dao has not been synchronized! Rolling back changes`);
                return this.execute(ROLLBACK_TRANSACTION)
                    .then(() => {
                        this.done();
                        this.state = State.released;
                        log(`Transaction rolled back; Connection released to the pool`);
                        logPoolState(this.pool);
                        return Promise.reject(new Error('Unsynchronized Dao detected during connection release'));
                    });
            }
        }).then(() => {
            this.done();
            this.state = State.released;
            log(`Dao released back to the pool; Dao is in (${State[this.state]})`);
            logPoolState(this.pool);
        });
    }

    // EXECUTE METHOD
    // --------------------------------------------------------------------------------------------
    execute<T>(query: ResultQuery<T>): Promise<T[]>
    execute(query: Query): Promise<void>
    execute(queries: Query[]): Promise<any>
    execute(queryOrQueries: Query | Query[]): Promise<any> {

        var { queries, query, state } = this.buildQueryList(queryOrQueries);
        var queryText = concatenateQueries(queries);

        log(`Executing [${queries}]; Dao is in (${State[this.state]})`);
        return new Promise((resolve, reject) => {
            this.client.query({ text: queryText, multiResult: true }, (error, results) => {
                if (error) {
                    reject(error);
                }
                else {
                    try {
                        log(`Queries executed; Processing results...`);
                        var collector = this.processResults(queries, <pg.QueryResult[]> results);
                        this.state = state;
                        log(`Query results processed; Dao is in (${State[this.state]})`);
                    }
                    catch (reason) {
                        reject(reason);
                        return;
                    }
                    resolve(query ? collector[query.name] : collector);
                }
            });
        }).catch((reason) => {
            log(`Failed to execute queries; rolling back transaction`);
            return this.execute(ROLLBACK_TRANSACTION)
                .catch((error) => {
                    this.done(error);
                    this.state = State.released;
                    log(`Transaction rolledback failed; Connection terminated`);
                    logPoolState(this.pool);
                    return Promise.reject(reason);
                }).then(() => {
                    this.done();
                    this.state = State.released;
                    log(`Transaction rolled back; Connection released to the pool`);
                    logPoolState(this.pool);
                    return Promise.reject(reason);
                });
        });
    }

    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    save(model: Model, setUpdatedOn = true): boolean {
        return this.store.save(model, setUpdatedOn);
    }

    destroy(model: Model) {
        this.store.destroy(model);
    }

    isRegistered(model: Model): boolean { return this.store.isRegistered(model); }
    getModelState(model: Model): ModelState { return this.store.getModelState(model); }
    isSaved(model: Model): boolean { return this.store.isSaved(model); }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private buildQueryList(queryOrQueries: Query | Query[]) {
        if (Array.isArray(queryOrQueries)) {
            var queries = <Query[]> queryOrQueries;
        }
        else {
            var queries = <Query[]> (queryOrQueries? [queryOrQueries] : []);
            var query = (<Query> queryOrQueries);
        }

        var state = this.state;
        if (this.state === State.transactionPending && queries.length > 0) {
            queries.unshift(BEGIN_TRANSACTION);
            state = State.transaction;
        }

        return { queries, query, state };
    }

    private processResults(queries: Query[], results: pg.QueryResult[]): any {
        assert(queries.length === results.length, `Cannot process query results: expected (${queries.length}) results but recieved (${results.length})`);

        var collector: any = {};

        for (let i = 0; i < results.length; i++) {
            let query = queries[i];
            let result = results[i];
            
            if ('type' in query) {
                let resultQuery = <ResultQuery<any>> query;
                if (resultQuery.mask === ResultMask.list) {
                    var processedResult = processListResult(resultQuery, result);
                }
                else {
                    assert.fail('Query result type is not supported')
                }
            }
            else {
                var processedResult = undefined;
            }

            if ('mutableModels' in query && processedResult) {
                let modelQuery = <ModelQuery<any>> query;
                this.store.register(modelQuery.handler, processedResult);
            }
                
            saveResult(collector, processedResult, query);
        }

        return collector;
    }
}

// COMMON QUERIES
// ================================================================================================
var BEGIN_TRANSACTION: Query = {
    text: 'BEGIN;',
    toString: () => 'BeginTransaction'
};

var COMMIT_TRANSACTION: Query = {
    text: 'COMMIT;',
    toString: () => 'CommitTransaction'
};

var ROLLBACK_TRANSACTION: Query = {
    text: 'ROLLBACK;',
    toString: () => 'RollbackTransaction'
};

// HELPER FUNCTIONS
// ================================================================================================
function concatenateQueries(queries: Query[]): string {
    var retval = '';
    for (var i = 0; i < queries.length; i++) {
        retval += queries[i].text;
    }
    return retval;
}

function processListResult(query: ResultQuery<any>, queryResult: pg.QueryResult) {
    var processedResult;
    if (query.handler && typeof query.handler.parse === 'function') {
        processedResult = [];
        for (var i = 0; i < queryResult.rows.length; i++) {
            processedResult.push(query.handler.parse(queryResult.rows[i]));
        }
    }
    else {
        processedResult = queryResult[i].rows;
    }
    return processedResult;
}

function saveResult(collector: any, result: any, query: Query) {
    if (result === undefined) return;

    var previousResult = collector[query.name];
    if (previousResult) {
        if (previousResult.isCollector) {
            previousResult.push(result);
        }
        else {
            collector[query.name] = [previousResult, result];
            collector[query.name].isCollector = true;
        }
    }
    else {
        collector[query.name] = result;
    }
}

function getSyncQueries(changes: SyncInfo[]): Query[]{
    var queries: Query[] = [];
    for (var i = 0; i < changes.length; i++) {
        var change = changes[i];
        var handler: ModelHandler<any> = change[symHandler];
        queries = queries.concat(handler.getSyncQueries(change.original, change.saved));
    }
    return queries;
}

function logPoolState(pool: pg.ClientPool) {
    log(`Connection pool state: { size: ${pool.getPoolSize()}, available: ${pool.availableObjectsCount()}}`);
}