// IMPORTS
// ================================================================================================
var debug = require('debug');
var assert = require('assert');
var pg = require('pg');
var Store_1 = require('./Store');
// MODULE VARIABLES
// ================================================================================================
var log = debug('pg:dao');
// ENUMS
// ================================================================================================
var State;
(function (State) {
    State[State["connection"] = 1] = "connection";
    State[State["transaction"] = 2] = "transaction";
    State[State["transactionPending"] = 3] = "transactionPending";
    State[State["released"] = 4] = "released";
})(State || (State = {}));
// DAO CLASS DEFINITION
// ================================================================================================
var Dao = (function () {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    function Dao(settings, client, done) {
        this.client = client;
        this.done = done;
        this.state = State.connection;
        this.store = new Store_1.Store();
        this.pool = pg.pools.getOrCreate(settings);
    }
    Object.defineProperty(Dao.prototype, "inTransaction", {
        // PUBLIC ACCESSORS
        // --------------------------------------------------------------------------------------------
        get: function () {
            return (this.state === State.transaction || this.state === State.transactionPending);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Dao.prototype, "isActive", {
        get: function () {
            return (this.state !== State.released);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Dao.prototype, "isSynchronized", {
        get: function () {
            return (this.store.hasChanges === false && this.inTransaction === false);
        },
        enumerable: true,
        configurable: true
    });
    // LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
    Dao.prototype.startTransaction = function () {
        assert(this.isActive, 'Cannot start transaction: Dao is currently not active');
        assert(!this.inTransaction, 'Cannot start transaction: Dao is already in transaction');
        log("Starting transaction");
        this.state = State.transactionPending;
        return Promise.resolve();
    };
    Dao.prototype.sync = function (commit) {
        var _this = this;
        if (commit === void 0) { commit = false; }
        assert(this.isActive, 'Cannot snyc: Dao is currently not active');
        var state = this.state;
        var changes = this.store.hasChanges ? this.store.getChanges() : [];
        var queries = getSyncQueries(changes);
        log("Syncing " + changes.length + " model(s); Dao is in (" + State[this.state] + ")");
        if (commit) {
            if (queries.length > 0 || this.state === State.transaction) {
                queries.push(COMMIT_TRANSACTION);
            }
            state = State.connection;
        }
        if (queries.length === 0) {
            this.state = state;
            log("Sync completed; Dao is in (" + State[this.state] + ")");
            return Promise.resolve(changes);
        }
        return this.execute(queries)
            .then(function () {
            _this.state = state;
            _this.store.applyChanges();
            log("Sync completed; Dao is in (" + State[_this.state] + ")");
            return changes;
        }).catch(function (reason) {
            log("Sync failed; Dao is in (" + State[_this.state] + ")");
            return Promise.reject(new Error("Sync failed: " + reason.message));
        });
    };
    Dao.prototype.release = function (rollback) {
        var _this = this;
        if (rollback === void 0) { rollback = false; }
        assert(this.state !== State.released, 'Cannot release: Dao has already been released');
        log("Releasing Dao back to the pool; Dao is in (" + State[this.state] + ")");
        return Promise.resolve().then(function () {
            if (rollback) {
                return _this.rollbackTransaction();
            }
            else if (_this.isSynchronized === false) {
                log("Dao has not been synchronized! Rolling back changes");
                return _this.rollbackTransaction(new Error('Unsynchronized Dao detected during connection release'));
            }
        }).then(function () {
            _this.done();
            _this.state = State.released;
            log("Dao released back to the pool; Dao is in (" + State[_this.state] + ")");
            logPoolState(_this.pool);
        });
    };
    Dao.prototype.execute = function (queryOrQueries) {
        var _this = this;
        var _a = this.buildQueryList(queryOrQueries), queries = _a.queries, query = _a.query, state = _a.state;
        var queryText = concatenateQueries(queries);
        log("Executing [" + queries + "]; Dao is in (" + State[this.state] + ")");
        return new Promise(function (resolve, reject) {
            _this.client.query({ text: queryText, multiResult: true }, function (error, results) {
                if (error) {
                    reject(error);
                }
                else {
                    try {
                        log("Queries executed; Processing results...");
                        var collector = _this.processResults(queries, results);
                        _this.state = state;
                        log("Query results processed; Dao is in (" + State[_this.state] + ")");
                    }
                    catch (reason) {
                        reject(reason);
                        return;
                    }
                    resolve(query && collector ? collector[query.name] : collector);
                }
            });
        }).catch(function (reason) {
            log("Failed to execute queries; rolling back transaction");
            return _this.rollbackTransaction(reason);
        });
    };
    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    Dao.prototype.insert = function (model) { this.store.insert(model); };
    Dao.prototype.destroy = function (model) { this.store.destroy(model); };
    Dao.prototype.hasModel = function (model) { return this.store.isRegistered(model); };
    Dao.prototype.isNew = function (model) { return this.store.isNew(model); };
    Dao.prototype.isDestroyed = function (model) { return this.store.isDestroyed(model); };
    Dao.prototype.isUpdated = function (model) { return this.store.isModified(model); };
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    Dao.prototype.buildQueryList = function (queryOrQueries) {
        if (Array.isArray(queryOrQueries)) {
            var queries = queryOrQueries;
        }
        else {
            var queries = (queryOrQueries ? [queryOrQueries] : []);
            var query = queryOrQueries;
        }
        var state = this.state;
        if (this.state === State.transactionPending && queries.length > 0) {
            queries.unshift(BEGIN_TRANSACTION);
            state = State.transaction;
        }
        return { queries: queries, query: query, state: state };
    };
    Dao.prototype.processResults = function (queries, results) {
        assert(queries.length === results.length, "Cannot process query results: expected (" + queries.length + ") results but recieved (" + results.length + ")");
        var collector;
        for (var i = 0; i < results.length; i++) {
            var query = queries[i];
            var result = results[i];
            if ('mask' in query) {
                var resultQuery = query;
                if (resultQuery.mask === 'list') {
                    var processedResult = processListResult(resultQuery, result);
                }
                else if (resultQuery.mask === 'object') {
                    var processedResult = processObjectResult(resultQuery, result);
                }
                else {
                    assert.fail('Query result type is not supported');
                }
            }
            else {
                var processedResult = undefined;
            }
            if (query['mutableModels'] === true && processedResult) {
                var modelQuery = query;
                this.store.register(modelQuery.handler, processedResult);
            }
            if (processedResult !== undefined) {
                if (collector === undefined)
                    collector = {};
                saveResult(collector, processedResult, query);
            }
        }
        return collector;
    };
    Dao.prototype.rollbackTransaction = function (reason) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.client.query(ROLLBACK_TRANSACTION.text, function (error, results) {
                if (error) {
                    _this.done(error);
                    _this.state = State.released;
                    log("Transaction rolledback failed; Connection terminated");
                    logPoolState(_this.pool);
                    reason ? reject(reason) : reject(error);
                }
                else {
                    if (reason) {
                        _this.done();
                        _this.state = State.released;
                        log("Transaction rolled back; Connection released to the pool");
                        logPoolState(_this.pool);
                        reject(reason);
                    }
                    else {
                        _this.state = State.connection;
                        log("Transaction rolled back; Dao is in (" + State[_this.state] + ")");
                        resolve();
                    }
                }
            });
        });
    };
    return Dao;
})();
exports.Dao = Dao;
// COMMON QUERIES
// ================================================================================================
var BEGIN_TRANSACTION = {
    text: 'BEGIN;',
    toString: function () { return 'BeginTransaction'; }
};
var COMMIT_TRANSACTION = {
    text: 'COMMIT;',
    toString: function () { return 'CommitTransaction'; }
};
var ROLLBACK_TRANSACTION = {
    text: 'ROLLBACK;',
    toString: function () { return 'RollbackTransaction'; }
};
// HELPER FUNCTIONS
// ================================================================================================
function concatenateQueries(queries) {
    var retval = '';
    for (var i = 0; i < queries.length; i++) {
        retval += queries[i].text;
    }
    return retval;
}
function processListResult(query, queryResult) {
    var processedResult;
    if (query.handler && typeof query.handler.parse === 'function') {
        processedResult = [];
        for (var i = 0; i < queryResult.rows.length; i++) {
            processedResult.push(query.handler.parse(queryResult.rows[i]));
        }
    }
    else {
        processedResult = queryResult.rows;
    }
    return processedResult;
}
function processObjectResult(query, queryResult) {
    if (queryResult.rows.length === 0)
        return;
    var processedResult;
    if (query.handler && typeof query.handler.parse === 'function') {
        processedResult = query.handler.parse(queryResult.rows[0]);
    }
    else {
        processedResult = queryResult.rows[0];
    }
    return processedResult;
}
function saveResult(collector, result, query) {
    if (result === undefined)
        return;
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
function getSyncQueries(changes) {
    var queries = [];
    for (var i = 0; i < changes.length; i++) {
        var change = changes[i];
        var handler = change.handler;
        queries = queries.concat(handler.getSyncQueries(change.original, change.current));
    }
    return queries;
}
function logPoolState(pool) {
    log("Connection pool state: { size: " + pool.getPoolSize() + ", available: " + pool.availableObjectsCount() + "}");
}
//# sourceMappingURL=Dao.js.map