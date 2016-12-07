"use strict";
// IMPORTS
// ================================================================================================
const pg_io_1 = require('pg-io');
const Store_1 = require('./Store');
const Model_1 = require('./Model');
const errors_1 = require('./errors');
const pg_io_2 = require('pg-io');
// MODULE VARIABLES
// ================================================================================================
const since = pg_io_1.util.since;
// DAO CLASS DEFINITION
// ================================================================================================
class Dao extends pg_io_1.Session {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dbName, client, options, logger) {
        super(dbName, client, options, logger);
        this.store = new Store_1.Store(options);
    }
    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isSynchronized() {
        return (this.store.hasChanges === false);
    }
    // FETCH METHODS
    // --------------------------------------------------------------------------------------------
    fetchOne(handler, selector, forUpdate = false) {
        if (!this.isActive) {
            return Promise.reject(new pg_io_2.ConnectionError('Cannot fetch a model: session has already been closed'));
        }
        if (!Model_1.isModelHandler(handler)) {
            return Promise.reject(new errors_1.ModelError('Cannot fetch a model: model handler is invalid'));
        }
        try {
            var query = handler.getFetchOneQuery(selector, forUpdate);
        }
        catch (error) {
            return Promise.reject(error);
        }
        if (!query) {
            return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch a model: fetch query for selector (${selector}) was not found`));
        }
        if (!Model_1.isModelQuery(query)) {
            return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch a model: fetch query is not a model query`));
        }
        if (query.mask !== 'object') {
            return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch a model: fetch query is not a single result query`));
        }
        if (query.mutable !== forUpdate) {
            return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch a model: fetch query mutable flag is not set correctly`));
        }
        return this.execute(query);
    }
    fetchAll(handler, selector, forUpdate = false) {
        if (!this.isActive) {
            return Promise.reject(new pg_io_2.ConnectionError('Cannot fetch models: session has already been closed'));
        }
        if (!Model_1.isModelHandler(handler)) {
            return Promise.reject(new errors_1.ModelError('Cannot fetch models: model handler is invalid'));
        }
        try {
            var query = handler.getFetchAllQuery(selector, forUpdate);
        }
        catch (error) {
            return Promise.reject(error);
        }
        if (!query) {
            return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch models: fetch query for selector (${selector}) was not found`));
        }
        if (!Model_1.isModelQuery(query)) {
            return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch models: fetch query is not a model query`));
        }
        if (query.mask !== 'list') {
            return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch models: fetch query is not a list result query`));
        }
        if (query.mutable !== forUpdate) {
            return Promise.reject(new errors_1.ModelQueryError(`Cannot fetch models: fetch query mutable flag is not set correctly`));
        }
        return this.execute(query);
    }
    // LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
    sync() {
        if (this.isActive === false) {
            return Promise.reject(new pg_io_2.ConnectionError('Cannot sync: session has already been closed'));
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
        });
    }
    // OVERRIDEN SESSION METHODS
    // --------------------------------------------------------------------------------------------
    close(action) {
        if (!this.isActive) {
            return Promise.reject(new pg_io_2.ConnectionError('Cannot close session: session has already been closed'));
        }
        // delegate rollbacks to the super
        if (action === 'rollback')
            return super.close(action);
        this.logger && this.logger.debug('Preparing to close session; checking for changes');
        const start = process.hrtime();
        try {
            const changes = this.store.getChanges();
            if (!changes.length) {
                this.logger && this.logger.debug(`No changes detected in ${since(start)} ms`);
                return super.close(action);
            }
            else {
                this.logger && this.logger.debug(`Found ${changes.length} changes in ${since(start)} ms`);
                if (action !== 'commit') {
                    throw new errors_1.SyncError('Unsynchronized models detected during session close');
                }
                const syncQueries = this.getModelSyncQueries(changes, true);
                this.logger && this.logger.debug('Committing transaction and closing the session');
                const syncPromise = this.execute(syncQueries).then(() => {
                    this.store.clear();
                    this.releaseConnection();
                });
                this.closing = true;
                return syncPromise;
            }
        }
        catch (error) {
            return this.rollbackAndRelease(error);
        }
    }
    processQueryResult(query, result) {
        if (Model_1.isModelQuery(query)) {
            const handler = query.handler;
            return this.store.load(handler, result.rows, query.mutable);
        }
        else {
            return super.processQueryResult(query, result);
        }
    }
    // CREATE METHODS
    // --------------------------------------------------------------------------------------------
    create(handler, attributes) {
        if (!this.isActive) {
            throw Promise.reject(new pg_io_2.ConnectionError('Cannot create a model: session has already been closed'));
        }
        const start = process.hrtime();
        this.logger && this.logger.debug(`Creating a new ${handler.name || 'Unnamed'} model`);
        if (!Model_1.isModelHandler(handler)) {
            return Promise.reject(new errors_1.ModelError('Cannot create a model: model handler is invalid'));
        }
        const idGenerator = handler.getIdGenerator();
        if (!idGenerator) {
            return Promise.reject(new errors_1.ModelError('Cannot create a model: model id generator is undefined'));
        }
        return idGenerator.getNextId(this).then((nextId) => {
            const model = handler.build(nextId, attributes);
            this.logger && this.logger.debug(`New ${handler.name || 'Unnamed'} model created in ${since(start)} ms`);
            return model;
        });
    }
    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    insert(model) {
        if (!this.isActive) {
            throw new pg_io_2.ConnectionError('Cannot insert a model: session has already been closed');
        }
        return this.store.insert(model);
    }
    destroy(model) {
        if (!this.isActive) {
            throw new pg_io_2.ConnectionError('Cannot destroy a model: session has already been closed');
        }
        return this.store.destroy(model);
    }
    clean(model) {
        if (!this.isActive) {
            throw new pg_io_2.ConnectionError('Cannot clean a model: session has already been closed');
        }
        return this.store.clean(model);
    }
    load(handler, seed) {
        if (!this.isActive) {
            throw new pg_io_2.ConnectionError('Cannot load a model: session has already been closed');
        }
        return this.store.load(handler, [seed], false)[0];
    }
    hasModel(model) { return this.store.has(model); }
    getModel(handler, id) {
        if (!this.isActive) {
            throw new pg_io_2.ConnectionError('Cannot get a model: session has already been closed');
        }
        return this.store.get(handler, id);
    }
    isNew(model) { return this.store.isNew(model); }
    isDestroyed(model) { return this.store.isDestroyed(model); }
    isModified(model) { return this.store.isModified(model); }
    isMutable(model) { return this.store.isMutable(model); }
    getChanges(model) { return this.store.getModelChanges(model); }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    getModelSyncQueries(changes, commit = false) {
        const timestamp = new Date();
        let queries = [];
        for (let [original, current, updates] of changes) {
            if (this.options.manageUpdatedOn && original && current) {
                current.updatedOn = timestamp;
                updates.push('updatedOn');
            }
            const handler = current ? current[Model_1.symHandler] : original[Model_1.symHandler];
            queries = queries.concat(handler.getSyncQueries(original, current, updates));
        }
        if (commit) {
            queries.push(COMMIT_TRANSACTION);
        }
        return queries;
    }
}
exports.Dao = Dao;
// COMMON QUERIES
// ================================================================================================
const COMMIT_TRANSACTION = {
    name: 'qCommitTransaction',
    text: 'COMMIT;'
};
//# sourceMappingURL=Dao.js.map