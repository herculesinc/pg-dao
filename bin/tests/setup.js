var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// IMPORTS
// ================================================================================================
var index_1 = require('./../index');
// SETUP
// ================================================================================================
var User = (function () {
    function User(seed) {
        this.id = seed.id;
        this.username = seed.username;
        this.createdOn = seed.createdOn;
        this.updatedOn = seed.updatedOn;
    }
    // STATIC
    // --------------------------------------------------------------------------------------------
    User.parse = function (row) {
        var user = new User(row);
        user[index_1.symbols.handler] = this;
        return user;
    };
    User.clone = function (user) {
        var clone = new User(user);
        clone[index_1.symbols.handler] = this;
        return clone;
    };
    User.areEqual = function (user1, user2) {
        if (user1 === undefined || user2 === undefined)
            return false;
        return (user1.id === user2.id
            && user1.username === user2.username
            && user1.createdOn.valueOf() === user2.createdOn.valueOf()
            && user1.updatedOn.valueOf() === user2.updatedOn.valueOf());
    };
    User.getSyncQueries = function (original, current) {
        var queries = [];
        if (original === undefined && current !== undefined) {
            queries.push(new qInsertUser(current));
        }
        else if (original !== undefined && current === undefined) {
            queries.push(new qDeleteUser(original));
        }
        else if (original !== undefined && current !== undefined) {
            queries.push(new qUpdateUser(current));
        }
        return queries;
    };
    User.infuse = function (target, source) {
        target.username = source.username;
        target.createdOn = source.createdOn;
        target.updatedOn = source.updatedOn;
    };
    return User;
})();
exports.User = User;
// QUERIES
// ================================================================================================
var AbstractQuery = (function () {
    function AbstractQuery() {
    }
    Object.defineProperty(AbstractQuery.prototype, "name", {
        get: function () { return this.constructor.name; },
        enumerable: true,
        configurable: true
    });
    return AbstractQuery;
})();
var qInsertUser = (function (_super) {
    __extends(qInsertUser, _super);
    function qInsertUser(user) {
        _super.call(this);
        this.text = "INSERT INTO tmp_users (id, username, created_on, updated_on)\n            SELECT {{id}}, {{username}}, {{createdOn}}, {{updatedOn}};";
        this.params = user;
    }
    return qInsertUser;
})(AbstractQuery);
var qDeleteUser = (function (_super) {
    __extends(qDeleteUser, _super);
    function qDeleteUser(user) {
        _super.call(this);
        this.text = "DELETE FROM tmp_users WHERE id = " + user.id + ";";
    }
    return qDeleteUser;
})(AbstractQuery);
var qUpdateUser = (function (_super) {
    __extends(qUpdateUser, _super);
    function qUpdateUser(user) {
        _super.call(this);
        this.text = "UPDATE tmp_users SET\n                        username = {{username}},\n                        updated_on = {{updatedOn}}\n                        WHERE id = " + user.id + ";";
        this.params = user;
    }
    return qUpdateUser;
})(AbstractQuery);
var qFetchUserById = (function () {
    function qFetchUserById(userId, lock) {
        if (lock === void 0) { lock = false; }
        this.handler = User;
        this.mask = 'object';
        this.mutable = lock;
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
        this.handler = User;
        this.mask = 'list';
        this.mutable = lock;
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
// DATABASE PRIMING
// ================================================================================================
function prepareDatabase(dao) {
    return dao.execute([{ text: "DROP TABLE IF EXISTS tmp_users;" },
        {
            text: "SELECT * INTO TEMPORARY tmp_users\n                FROM (VALUES \n\t\t            (1::bigint,\t'Irakliy'::VARCHAR, now()::timestamptz, now()::timestamptz),\n\t\t            (2::bigint,\t'Yason'::VARCHAR, \tnow()::timestamptz, now()::timestamptz),\n\t\t            (3::bigint,\t'George'::VARCHAR, \tnow()::timestamptz, now()::timestamptz)\n\t            ) AS q (id, username, created_on, updated_on);"
        }
    ]);
}
exports.prepareDatabase = prepareDatabase;
//# sourceMappingURL=setup.js.map