'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _pgIo = require('pg-io');

var _Store = require('./Store');

var _Model = require('./Model');

var _errors = require('./errors');

// DAO CLASS DEFINITION
// ================================================================================================

class Dao extends _pgIo.Connection {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options, client, done) {
        super(options, client, done);
        this.store = new _Store.Store(options);
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

        if (this.isActive === false) return Promise.reject(new _pgIo.ConnectionError('Cannot fetch a model: connection has already been released'));
        if ((0, _Model.isModelHandler)(handler) === false) return Promise.reject(new _errors.ModelError('Cannot fetch a model: model handler is invalid'));
        try {
            var query = handler.getFetchOneQuery(selector, forUpdate);
        } catch (error) {
            return Promise.reject(error);
        }
        if (query === undefined) return Promise.reject(new _errors.ModelQueryError(`Cannot fetch a model: fetch query for selector (${ selector }) was not found`));
        if ((0, _Model.isModelQuery)(query) === false) return Promise.reject(new _errors.ModelQueryError(`Cannot fetch a model: fetch query is not a model query`));
        if (query.mask !== 'object') return Promise.reject(new _errors.ModelQueryError(`Cannot fetch a model: fetch query is not a single result query`));
        if (query.mutable !== forUpdate) return Promise.reject(new _errors.ModelQueryError(`Cannot fetch a model: fetch query mutable flag is not set correctly`));
        return this.execute(query);
    }
    fetchAll(handler, selector) {
        let forUpdate = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

        if (this.isActive === false) return Promise.reject(new _pgIo.ConnectionError('Cannot fetch models: connection has already been released'));
        if ((0, _Model.isModelHandler)(handler) === false) return Promise.reject(new _errors.ModelError('Cannot fetch models: model handler is invalid'));
        try {
            var query = handler.getFetchAllQuery(selector, forUpdate);
        } catch (error) {
            return Promise.reject(error);
        }
        if (query === undefined) return Promise.reject(new _errors.ModelQueryError(`Cannot fetch models: fetch query for selector (${ selector }) was not found`));
        if ((0, _Model.isModelQuery)(query) === false) return Promise.reject(new _errors.ModelQueryError(`Cannot fetch models: fetch query is not a model query`));
        if (query.mask !== 'list') return Promise.reject(new _errors.ModelQueryError(`Cannot fetch models: fetch query is not a list result query`));
        if (query.mutable !== forUpdate) return Promise.reject(new _errors.ModelQueryError(`Cannot fetch models: fetch query mutable flag is not set correctly`));
        return this.execute(query);
    }
    // LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
    sync() {
        if (this.isActive === false) return Promise.reject(new _pgIo.ConnectionError('Cannot sync: connection has already been released'));
        var changes;
        return Promise.resolve().then(() => {
            changes = this.store.getChanges();
            return this.getModelSyncQueries(changes);
        }).catch(reason => this.rollbackAndRelease(reason)).then(queries => {
            if (queries.length === 0) return Promise.resolve(changes);
            return this.execute(queries).then(() => {
                this.store.applyChanges(changes);
                return changes;
            });
        }).catch(reason => {
            if (reason instanceof _errors.SyncError) reason = new _errors.SyncError('DAO Sync failed', reason);
            return Promise.reject(reason);
        });
    }
    // OVERRIDEN CONNECTION METHODS
    // --------------------------------------------------------------------------------------------
    release(action) {
        if (this.isActive === false) return Promise.reject(new _pgIo.ConnectionError('Cannot release connection: connection has already been released'));
        try {
            var changes = this.store.getChanges();
        } catch (error) {
            return this.rollbackAndRelease(error);
        }
        if (changes.length === 0) return super.release(action);
        switch (action) {
            case 'commit':
                var queries = this.getModelSyncQueries(changes, true);
                return this.execute(queries).then(() => {
                    changes = this.store.applyChanges(changes);
                    this.releaseConnection();
                    return changes;
                });
            case 'rollback':
                return this.rollbackAndRelease();
            default:
                return this.rollbackAndRelease(new _errors.SyncError('Unsynchronized models detected during connection release'));
        }
    }
    processQueryResult(query, result) {
        if ((0, _Model.isModelQuery)(query)) {
            var handler = query.handler;
            return this.store.load(handler, result.rows, query.mutable);
        } else {
            return super.processQueryResult(query, result);
        }
    }
    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    insert(model) {
        return this.store.insert(model);
    }
    destroy(model) {
        return this.store.destroy(model);
    }
    clean(model) {
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
            var handler = current ? current[_Model.symHandler] : original[_Model.symHandler];
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

// COMMON QUERIES
// ================================================================================================
exports.Dao = Dao;
var BEGIN_TRANSACTION = {
    text: 'BEGIN;'
};
var COMMIT_TRANSACTION = {
    text: 'COMMIT;'
};
var ROLLBACK_TRANSACTION = {
    text: 'ROLLBACK;'
};
//# sourceMappingURL=../../bin/lib/Dao.js.map