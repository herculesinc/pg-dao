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
        return new User(user);
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
    UserHandler.prototype.getSyncQueries = function (origina, current) {
        return [];
    };
    return UserHandler;
})();
exports.UserHandler = UserHandler;
//# sourceMappingURL=setup.js.map