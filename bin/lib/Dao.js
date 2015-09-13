var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// IMPORTS
// ================================================================================================
var pg_io_1 = require('pg-io');
var Store_1 = require('./Store');
var Model_1 = require('./Model');
;
// DAO CLASS DEFINITION
// ================================================================================================
var Dao = (function (_super) {
    __extends(Dao, _super);
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    function Dao(options, client, done) {
        _super.call(this, options, client, done);
        this.store = new Store_1.Store(options);
    }
    Object.defineProperty(Dao.prototype, "isSynchronized", {
        // PUBLIC ACCESSORS
        // --------------------------------------------------------------------------------------------
        get: function () {
            return (this.store.hasChanges === false);
        },
        enumerable: true,
        configurable: true
    });
    // LIFECYCLE METHODS
    // --------------------------------------------------------------------------------------------
    Dao.prototype.sync = function (commit) {
        var _this = this;
        if (commit === void 0) { commit = false; }
        if (this.isActive === false)
            return Promise.reject(new Error('Cannot snyc: Dao is currently not active'));
        var state = this.state;
        var changes;
        return Promise.resolve().then(function () {
            changes = _this.store.getChanges();
            var queries = getSyncQueries(changes);
            if (commit) {
                if (queries.length > 0 || _this.state === 2 /* transaction */) {
                    queries.push(COMMIT_TRANSACTION);
                }
                state = 1 /* connection */;
            }
            return queries;
        }).catch(function (reason) { return _this.rollbackAndRelease(reason); })
            .then(function (queries) {
            if (queries.length === 0) {
                _this.state = state;
                return Promise.resolve(changes);
            }
            return _this.execute(queries).then(function () {
                _this.state = state;
                _this.store.applyChanges();
                return changes;
            });
        }).catch(function (reason) { return Promise.reject(new Error("Sync failed: " + reason.message)); });
    };
    // OVERRIDEN CONNECTION METHODS
    // --------------------------------------------------------------------------------------------
    Dao.prototype.release = function (action) {
        var _this = this;
        if (this.isActive === false)
            return Promise.reject(new Error('Cannot snyc: Dao is currently not active'));
        if (this.isSynchronized)
            return _super.prototype.release.call(this, action);
        switch (action) {
            case 'commit':
                return this.sync(true).then(function (changes) {
                    _this.releaseConnection();
                    return changes;
                });
            case 'rollback':
                return this.rollbackAndRelease()
                    .then(function () { return _this.store.cleanChanges(); });
            default:
                return this.rollbackAndRelease(new Error('Unsynchronized models detected during connection release'));
        }
    };
    Dao.prototype.processQueryResult = function (query, result) {
        if (Model_1.isModelQuery(query)) {
            var modelQuery = query; // TODO: won't be needed with TS 1.6
            var handler = modelQuery.handler;
            return this.store.load(handler, result.rows, modelQuery.mutable);
        }
        else {
            return _super.prototype.processQueryResult.call(this, query, result);
        }
    };
    // STORE PASS THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    Dao.prototype.insert = function (model) { return this.store.insert(model); };
    Dao.prototype.destroy = function (model) { return this.store.destroy(model); };
    Dao.prototype.clean = function (model) { return this.store.clean(model); };
    Dao.prototype.hasModel = function (model) { return this.store.has(model); };
    Dao.prototype.isNew = function (model) { return this.store.isNew(model); };
    Dao.prototype.isDestroyed = function (model) { return this.store.isDestroyed(model); };
    Dao.prototype.isModified = function (model) { return this.store.isModified(model); };
    Dao.prototype.isMutable = function (model) { return this.store.isMutable(model); };
    return Dao;
})(pg_io_1.Connection);
exports.Dao = Dao;
// HELPER FUNCTIONS
// ================================================================================================
function getSyncQueries(changes) {
    var queries = [];
    for (var i = 0; i < changes.length; i++) {
        var original = changes[i].original;
        var current = changes[i].current;
        if (original !== undefined && current !== undefined) {
            current.updatedOn = new Date();
        }
        var handler = current ? current[Model_1.symHandler] : original[Model_1.symHandler];
        queries = queries.concat(handler.getSyncQueries(original, current));
    }
    return queries;
}
// COMMON QUERIES
// ================================================================================================
var BEGIN_TRANSACTION = {
    text: 'BEGIN;'
};
var COMMIT_TRANSACTION = {
    text: 'COMMIT;'
};
var ROLLBACK_TRANSACTION = {
    text: 'ROLLBACK;'
};
//# sourceMappingURL=Dao.js.map