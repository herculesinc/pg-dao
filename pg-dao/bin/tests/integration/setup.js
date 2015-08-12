// IMPORTS
// ================================================================================================
var index_1 = require('./../../index');
// SETUP
// ================================================================================================
var User = (function () {
    function User(seed) {
        this.id = seed.id;
        this.username = seed.username;
        this.createdOn = seed.createdOn;
        this.updatedOn = seed.updatedOn;
    }
    return User;
})();
exports.User = User;
var UserHandler = (function () {
    function UserHandler() {
    }
    UserHandler.prototype.parse = function (row) {
        var user = new User(row);
        user[index_1.symbols.handler] = this;
        return user;
    };
    UserHandler.prototype.clone = function (user) {
        var user = new User(user);
        user[index_1.symbols.handler] = this;
        return user;
    };
    UserHandler.prototype.areEqual = function (user1, user2) {
        if (user1 === undefined || user2 === undefined) {
            return false;
        }
        return (user1.id === user2.id
            && user1.username === user2.username
            && user1.createdOn.valueOf() === user2.createdOn.valueOf()
            && user1.updatedOn.valueOf() === user2.updatedOn.valueOf());
    };
    UserHandler.prototype.getSyncQueries = function (original, current) {
        var queries = [];
        if (original === undefined && current !== undefined) {
            queries.push({
                text: "INSERT INTO tmp_users (id, username, created_on, updated_on)\n                        SELECT " + current.id + ", '" + current.username + "', '" + current.createdOn.toISOString() + "', '" + current.updatedOn.toISOString() + "';"
            });
        }
        else if (original !== undefined && current === undefined) {
            queries.push({
                text: "DELETE FROM tmp_users WHERE id = " + original.id + ";"
            });
        }
        else if (original !== undefined && current !== undefined) {
            queries.push({
                text: "UPDATE tmp_users SET\n                        username = '" + current.username + "',\n                        updated_on = '" + current.updatedOn.toISOString() + "'\n                        WHERE id = " + current.id
            });
        }
        return queries;
    };
    return UserHandler;
})();
exports.UserHandler = UserHandler;
exports.userHandler = new UserHandler();
var qFetchUserById = (function () {
    function qFetchUserById(userId, lock) {
        if (lock === void 0) { lock = false; }
        this.handler = exports.userHandler;
        this.mask = 'object';
        this.mutableModels = lock;
        this.text = "\n            SELECT id, username, created_on AS \"createdOn\", updated_on AS \"updatedOn\"\n            FROM tmp_users WHERE id = " + userId + ";";
    }
    Object.defineProperty(qFetchUserById.prototype, "name", {
        get: function () { return this.constructor.name; },
        enumerable: true,
        configurable: true
    });
    return qFetchUserById;
})();
exports.qFetchUserById = qFetchUserById;
var qFetchUsersByIdList = (function () {
    function qFetchUsersByIdList(userIdList, lock) {
        if (lock === void 0) { lock = false; }
        this.handler = exports.userHandler;
        this.mask = 'list';
        this.mutableModels = lock;
        this.text = "\n            SELECT id, username, created_on AS \"createdOn\", updated_on AS \"updatedOn\"\n            FROM tmp_users WHERE id in (" + userIdList.join(',') + ")\n            ORDER BY id;";
    }
    Object.defineProperty(qFetchUsersByIdList.prototype, "name", {
        get: function () { return this.constructor.name; },
        enumerable: true,
        configurable: true
    });
    return qFetchUsersByIdList;
})();
exports.qFetchUsersByIdList = qFetchUsersByIdList;
function prepareDatabase(dao) {
    return dao.execute([{ text: "DROP TABLE IF EXISTS tmp_users;" },
        {
            text: "SELECT * INTO TEMPORARY tmp_users\n                FROM (VALUES \n\t\t            (1::bigint,\t'Irakliy'::VARCHAR, now()::timestamptz, now()::timestamptz),\n\t\t            (2::bigint,\t'Yason'::VARCHAR, \tnow()::timestamptz, now()::timestamptz),\n\t\t            (3::bigint,\t'George'::VARCHAR, \tnow()::timestamptz, now()::timestamptz)\n\t            ) AS q (id, username, created_on, updated_on);"
        }
    ]);
}
exports.prepareDatabase = prepareDatabase;
//# sourceMappingURL=setup.js.map