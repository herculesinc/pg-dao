"use strict";
// IMPORTS
// ================================================================================================
var pg_io_1 = require('pg-io');
var Store_1 = require('./Store');
var Model_1 = require('./Model');
var errors_1 = require('./errors');
var pg_io_2 = require('pg-io');
// DAO CLASS DEFINITION
// ================================================================================================
class Dao extends pg_io_1.Connection {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(database, options) {
        super(database, options);
        this.store = new Store_1.Store(options);
    }
    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isSynchronized() {
        return this.store.hasChanges === false;
    }
    // FETCH METHODS
    // --------------------------------------------------------------------------------------------
    fetchOne(handler, selector) {
        let forUpdate = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

        if (this.isActive === false) return Promise.reject(new pg_io_2.ConnectionError('Cannot fetch a model: connection has already been released'));
        if (Model_1.isModelHandler(handler) === false) return Promise.reject(new errors_1.ModelError('Cannot fetch a model: model handler is invalid'));
        try {
            var query = handler.getFetchOneQuery(selector, forUpdate);
        } catch (error) {
            return Promise.reject(error);
        }
        if (query === undefined) return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch a model: fetch query for selector (${ selector }) was not found`));
        if (Model_1.isModelQuery(query) === false) return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch a model: fetch query is not a model query`));
        if (query.mask !== 'object') return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch a model: fetch query is not a single result query`));
        if (query.mutable !== forUpdate) return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch a model: fetch query mutable flag is not set correctly`));
        return this.execute(query);
    }
    fetchAll(handler, selector) {
        let forUpdate = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

        if (this.isActive === false) return Promise.reject(new pg_io_2.ConnectionError('Cannot fetch models: connection has already been released'));
        if (Model_1.isModelHandler(handler) === false) return Promise.reject(new errors_1.ModelError('Cannot fetch models: model handler is invalid'));
        try {
            var query = handler.getFetchAllQuery(selector, forUpdate);
        } catch (error) {
            return Promise.reject(error);
        }
        if (query === undefined) return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch models: fetch query for selector (${ selector }) was not found`));
        if (Model_1.isModelQuery(query) === false) return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch models: fetch query is not a model query`));
        if (query.mask !== 'list') return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch models: fetch query is not a list result query`));
        if (query.mutable !== forUpdate) return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch models: fetch query mutable flag is not set correctly`));
        return this.execute(query);
    }
    // LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
    sync() {
        if (this.isActive === false) return Promise.reject(new pg_io_2.ConnectionError('Cannot sync: connection has already been released'));
        var start = process.hrtime();
        this.log && this.log('Synchronizing Dao');
        var changes;
        return Promise.resolve().then(() => {
            changes = this.store.getChanges();
            return this.getModelSyncQueries(changes);
        }).catch(reason => this.rollbackAndRelease(reason)).then(queries => {
            if (queries.length === 0) {
                this.log && this.log(`No changes detected in ${ pg_io_1.utils.since(start) } ms`);
                return Promise.resolve(changes);
            }
            return this.execute(queries).then(() => {
                this.store.applyChanges(changes);
                this.log && this.log(`Synchronized ${ changes.length } changes in ${ pg_io_1.utils.since(start) } ms`);
                return changes;
            });
        }).catch(reason => {
            if (reason instanceof errors_1.SyncError) reason = new errors_1.SyncError('DAO Sync failed', reason);
            return Promise.reject(reason);
        });
    }
    // OVERRIDEN CONNECTION METHODS
    // --------------------------------------------------------------------------------------------
    release(action) {
        if (this.isActive === false) return Promise.reject(new pg_io_2.ConnectionError('Cannot release connection: connection has already been released'));
        var start = process.hrtime();
        try {
            this.log && this.log('Preparing to release Dao connection; checking for changes');
            var changes = this.store.getChanges();
            this.log && this.log(`Found ${ changes.length } changes in ${ pg_io_1.utils.since(start) } ms`);
        } catch (error) {
            return this.rollbackAndRelease(error);
        }
        if (changes.length === 0) return super.release(action);
        start = process.hrtime();
        switch (action) {
            case 'commit':
                this.log && this.log('Committing transaction and releasing connection back to the pool');
                var queries = this.getModelSyncQueries(changes, true);
                return this.execute(queries).then(() => {
                    changes = this.store.applyChanges(changes); // TODO: potentially remove
                    this.releaseConnection();
                    this.log && this.log(`Transaction committed in ${ pg_io_1.utils.since(start) } ms; pool state: ${ this.database.getPoolDescription() }`);
                    return changes;
                });
            case 'rollback':
                this.log && this.log('Rolling back transaction and releasing connection back to the pool');
                return this.rollbackAndRelease().then(result => {
                    this.log && this.log(`Transaction rolled back in ${ pg_io_1.utils.since(start) } ms; pool state: ${ this.database.getPoolDescription() }`);
                    return result;
                });
            default:
                return this.rollbackAndRelease(new errors_1.SyncError('Unsynchronized models detected during connection release'));
        }
    }
    processQueryResult(query, result) {
        if (Model_1.isModelQuery(query)) {
            var handler = query.handler;
            return this.store.load(handler, result.rows, query.mutable);
        } else {
            return super.processQueryResult(query, result);
        }
    }
    // CREATE METHODS
    // --------------------------------------------------------------------------------------------
    create(handler, attributes) {
        if (this.isActive === false) throw Promise.reject(new pg_io_2.ConnectionError('Cannot create a model: connection has already been released'));
        var start = process.hrtime();
        this.log && this.log(`Creating a new ${ handler.name || 'Unnamed' } model`);
        if (Model_1.isModelHandler(handler) === false) return Promise.reject(new errors_1.ModelError('Cannot create a model: model handler is invalid'));
        var idGenerator = handler.getIdGenerator();
        if (!idGenerator) return Promise.reject(new errors_1.ModelError('Cannot create a model: model id generator is undefined'));
        return idGenerator.getNextId(this).then(nextId => {
            var model = handler.build(nextId, attributes);
            this.log && this.log(`New ${ handler.name || 'Unnamed' } model created in ${ pg_io_1.utils.since(start) } ms`);
            return model;
        });
    }
    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    insert(model) {
        if (this.isActive === false) throw new pg_io_2.ConnectionError('Cannot insert a model: connection has already been released');
        return this.store.insert(model);
    }
    destroy(model) {
        if (this.isActive === false) throw new pg_io_2.ConnectionError('Cannot destroy a model: connection has already been released');
        return this.store.destroy(model);
    }
    clean(model) {
        if (this.isActive === false) throw new pg_io_2.ConnectionError('Cannot clean a model: connection has already been released');
        return this.store.clean(model);
    }
    hasModel(model) {
        return this.store.has(model);
    }
    isNew(model) {
        return this.store.isNew(model);
    }
    isDestroyed(model) {
        return this.store.isDestroyed(model);
    }
    isModified(model) {
        return this.store.isModified(model);
    }
    isMutable(model) {
        return this.store.isMutable(model);
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    getModelSyncQueries(changes) {
        let commit = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

        var queries = [];
        for (var i = 0; i < changes.length; i++) {
            let original = changes[i].original;
            let current = changes[i].current;
            if (this.options.manageUpdatedOn && original !== undefined && current !== undefined) {
                current.updatedOn = new Date();
            }
            var handler = current ? current[Model_1.symHandler] : original[Model_1.symHandler];
            queries = queries.concat(handler.getSyncQueries(original, current));
        }
        if (commit) {
            if (queries.length > 0 || this.state === 2 /* transaction */) {
                    queries.push(COMMIT_TRANSACTION);
                }
        }
        return queries;
    }
}
exports.Dao = Dao;
// COMMON QUERIES
// ================================================================================================
var BEGIN_TRANSACTION = {
    name: 'qBeginTransaction',
    text: 'BEGIN;'
};
var COMMIT_TRANSACTION = {
    name: 'qCommitTransaction',
    text: 'COMMIT;'
};
var ROLLBACK_TRANSACTION = {
    name: 'qRollbackTransaction',
    text: 'ROLLBACK;'
};
//# sourceMappingURL=Dao.js.map
