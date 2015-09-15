// IMPORTS
// ================================================================================================
var pg = require('pg-io');
var Dao_1 = require('./lib/Dao');
var Model_1 = require('./lib/Model');
;
// GLOBALS
// ================================================================================================
exports.symbols = {
    handler: Model_1.symHandler
};
exports.defaults = {
    collapseQueries: false,
    startTransaction: false,
    validateImmutability: true,
    validateHandlerOutput: true,
    manageUpdatedOn: true,
};
pg.defaults = exports.defaults;
pg.ConnectionConstructor = Dao_1.Dao;
// RE-EXPORT
// ================================================================================================
var pg_io_1 = require('pg-io');
exports.db = pg_io_1.db;
//# sourceMappingURL=index.js.map