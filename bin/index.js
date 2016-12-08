"use strict";
// IMPORTS
// ================================================================================================
const pg = require("pg-io");
const Dao_1 = require("./lib/Dao");
const Model_1 = require("./lib/Model");
const AbstractModel_1 = require("./lib/AbstractModel");
// GLOBALS
// ================================================================================================
exports.symbols = {
    handler: Model_1.symHandler,
    dbSchema: AbstractModel_1.symbols.dbSchema,
};
// set session constructor
pg.defaults.SessionCtr = Dao_1.Dao;
// set extended defaults
pg.defaults.session.validateImmutability = true;
pg.defaults.session.validateHandlerOutput = true;
pg.defaults.session.manageUpdatedOn = true;
// RE-EXPORTS
// ================================================================================================
var pg_io_1 = require("pg-io");
exports.Database = pg_io_1.Database;
exports.defaults = pg_io_1.defaults;
exports.PgError = pg_io_1.PgError;
exports.ConnectionError = pg_io_1.ConnectionError;
exports.TransactionError = pg_io_1.TransactionError;
exports.QueryError = pg_io_1.QueryError;
exports.ParseError = pg_io_1.ParseError;
var errors_1 = require("./lib/errors");
exports.ModelError = errors_1.ModelError;
exports.ModelQueryError = errors_1.ModelQueryError;
exports.StoreError = errors_1.StoreError;
exports.SyncError = errors_1.SyncError;
var types_1 = require("./lib/types");
exports.Timestamp = types_1.Timestamp;
var AbstractModel_2 = require("./lib/AbstractModel");
exports.AbstractModel = AbstractModel_2.AbstractModel;
var decorators_1 = require("./lib/decorators");
exports.dbModel = decorators_1.dbModel;
exports.dbField = decorators_1.dbField;
var Model_2 = require("./lib/Model");
exports.PgIdGenerator = Model_2.PgIdGenerator;
var queries_1 = require("./lib/queries");
exports.AbstractActionQuery = queries_1.AbstractActionQuery;
exports.AbstractModelQuery = queries_1.AbstractModelQuery;
//# sourceMappingURL=index.js.map