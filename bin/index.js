"use strict";
// IMPORTS
// ================================================================================================
const pg = require('pg-io');
const Dao_1 = require('./lib/Dao');
const Model_1 = require('./lib/Model');
const AbstractModel_1 = require('./lib/AbstractModel');
;
// GLOBALS
// ================================================================================================
exports.symbols = {
    handler: Model_1.symHandler,
    fetchQuery: AbstractModel_1.symbols.fetchQuery,
    updateQuery: AbstractModel_1.symbols.updateQuery,
    insertQuery: AbstractModel_1.symbols.insertQuery,
    deleteQuery: AbstractModel_1.symbols.deleteQuery,
    dbTable: AbstractModel_1.symbols.dbTable,
    dbSchema: AbstractModel_1.symbols.dbSchema,
    idGenerator: AbstractModel_1.symbols.idGenerator,
    arrayComparator: AbstractModel_1.symbols.arrayComparator
};
var defaults = {
    collapseQueries: false,
    startTransaction: false,
    validateImmutability: true,
    validateHandlerOutput: true,
    manageUpdatedOn: true
};
pg.defaults = Object.assign(pg.defaults, defaults);
pg.config.connectionConstructor = Dao_1.Dao;
//pg.config.logger = console;
// RE-EXPORTS
// ================================================================================================
var pg_io_1 = require('pg-io');
exports.db = pg_io_1.db;
exports.config = pg_io_1.config;
exports.defaults = pg_io_1.defaults;
exports.PgError = pg_io_1.PgError;
exports.ConnectionError = pg_io_1.ConnectionError;
exports.TransactionError = pg_io_1.TransactionError;
exports.QueryError = pg_io_1.QueryError;
exports.ParseError = pg_io_1.ParseError;
var errors_1 = require('./lib/errors');
exports.ModelError = errors_1.ModelError;
exports.ModelQueryError = errors_1.ModelQueryError;
exports.StoreError = errors_1.StoreError;
exports.SyncError = errors_1.SyncError;
var AbstractModel_2 = require('./lib/AbstractModel');
exports.AbstractModel = AbstractModel_2.AbstractModel;
var decorators_1 = require('./lib/decorators');
exports.dbModel = decorators_1.dbModel;
exports.dbField = decorators_1.dbField;
var Model_2 = require('./lib/Model');
exports.PgIdGenerator = Model_2.PgIdGenerator;
var queries_1 = require('./lib/queries');
exports.AbstractActionQuery = queries_1.AbstractActionQuery;
exports.AbstractModelQuery = queries_1.AbstractModelQuery;
//# sourceMappingURL=index.js.map
