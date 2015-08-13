// IMPORTS
// ================================================================================================
var pg = require('pg');
var Dao_1 = require('./lib/Dao');
var Model_1 = require('./lib/Model');
;
// GLOBALS
// ================================================================================================
pg.defaults.parseInt8 = true;
exports.symbols = {
    handler: Model_1.symHandler
};
// CONNECT FUNCTION
// ================================================================================================
function connect(settings) {
    return new Promise(function (resolve, reject) {
        pg.connect(settings, function (err, client, done) {
            if (err)
                return reject(err);
            var dao = new Dao_1.Dao(settings, client, done);
            resolve(dao);
        });
    });
}
exports.connect = connect;
function getPoolState(settings) {
    var pool = pg.pools.getOrCreate(settings);
    return {
        size: pool.getPoolSize(),
        available: pool.availableObjectsCount()
    };
}
exports.getPoolState = getPoolState;
//# sourceMappingURL=index.js.map