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
var databases = new Map();
function db(settings) {
    var db = databases.get(JSON.stringify(settings));
    if (db === undefined) {
        db = new Database(settings);
        databases.set(JSON.stringify(settings), db);
    }
    return db;
}
exports.db = db;
// DATABASE CLASS
// ================================================================================================
var Database = (function () {
    function Database(settings) {
        this.settings = settings;
    }
    Database.prototype.connect = function (options) {
        var _this = this;
        // TODO: merge options
        return new Promise(function (resolve, reject) {
            pg.connect(_this.settings, function (err, client, done) {
                if (err)
                    return reject(err);
                var dao = new Dao_1.Dao(_this.settings, client, done);
                resolve(dao);
            });
        });
    };
    Database.prototype.getPoolState = function () {
        var pool = pg.pools.getOrCreate(this.settings);
        return {
            size: pool.getPoolSize(),
            available: pool.availableObjectsCount()
        };
    };
    return Database;
})();
//# sourceMappingURL=index.js.map