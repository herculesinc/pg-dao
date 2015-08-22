var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
// IMPORTS
// ================================================================================================
var index_1 = require('./../../index');
var InsertQuery = Symbol();
var UpdateQuery = Symbol();
var DeleteQuery = Symbol();
// SETUP
// ================================================================================================
var AbstractModel = (function () {
    function AbstractModel(seed) {
        this.id = seed.id;
        this.createdOn = seed.createdOn;
        this.updatedOn = seed.updatedOn;
    }
    AbstractModel.parse = function (row) {
        var model = new this(row);
        model[index_1.symbols.handler] = this;
        return model;
    };
    AbstractModel.clone = function (model) {
        var clone = new this(model);
        clone[index_1.symbols.handler] = this;
        return clone;
    };
    AbstractModel.getSyncQueries = function (original, current) {
        var queries = [];
        if (original === undefined && current !== undefined) {
            var qInsertModel = this[InsertQuery];
            queries.push(new qInsertModel(current));
        }
        else if (original !== undefined && current === undefined) {
            var qDeleteModel = this[DeleteQuery];
            queries.push(new qDeleteModel(original));
        }
        else if (original !== undefined && current !== undefined) {
            var qUpdateModel = this[UpdateQuery];
            queries.push(new qUpdateModel(current));
        }
        return queries;
    };
    return AbstractModel;
})();
function ModelDecorator(insertQuery, updateQuery, deleteQuery) {
    return function (target) {
        target[InsertQuery] = insertQuery;
        target[UpdateQuery] = updateQuery;
        target[DeleteQuery] = deleteQuery;
        console.log(deleteQuery);
    };
}
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
        this.text = "INSERT INTO tmp_users (id, username, created_on, updated_on)\n            SELECT " + user.id + ", '" + user.username + "', '" + user.createdOn.toISOString() + "', '" + user.updatedOn.toISOString() + "';";
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
        this.text = "UPDATE tmp_users SET\n                        username = '" + user.username + "',\n                        updated_on = '" + user.updatedOn.toISOString() + "'\n                        WHERE id = " + user.id + ";";
    }
    return qUpdateUser;
})(AbstractQuery);
var qFetchUserById = (function () {
    function qFetchUserById(userId, lock) {
        if (lock === void 0) { lock = false; }
        this.handler = User;
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
        this.handler = User;
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
// USER MODEL
// ================================================================================================
var User = (function (_super) {
    __extends(User, _super);
    function User(seed) {
        _super.call(this, seed);
        this.username = seed.username;
    }
    User.areEqual = function (user1, user2) {
        if (user1 === undefined || user2 === undefined) {
            return false;
        }
        return (user1.id === user2.id
            && user1.username === user2.username
            && user1.createdOn.valueOf() === user2.createdOn.valueOf()
            && user1.updatedOn.valueOf() === user2.updatedOn.valueOf());
    };
    User = __decorate([
        ModelDecorator(qInsertUser, qUpdateUser, qDeleteUser)
    ], User);
    return User;
})(AbstractModel);
exports.User = User;
//# sourceMappingURL=setup.js.map