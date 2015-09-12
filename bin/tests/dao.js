// IMPORTS
// ================================================================================================
var assert = require('assert');
var pg = require('./../index');
var setup_1 = require('./setup');
// CONNECTION SETTINGS
// ================================================================================================
var settings = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'RepT%8&G5l1I',
    database: 'postgres'
};
// FETCHING TESTS
// ================================================================================================
describe('DAO: Fetching Models', function () {
    it('Fetching a single model should added it to the store', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1);
                return dao.execute(query).then(function (user) {
                    assert.strictEqual(user.id, 1);
                    assert.strictEqual(user.username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isMutable(user), false);
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Fetching a locked model should make it mutable', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1, true);
                return dao.execute(query).then(function (user) {
                    assert.strictEqual(user.id, 1);
                    assert.strictEqual(user.username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isMutable(user), true);
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Fetching multiple models should add them to the store', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUsersByIdList([1, 3]);
                return dao.execute(query).then(function (users) {
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert.strictEqual(dao.hasModel(users[0]), true);
                    assert.strictEqual(dao.isNew(users[0]), false);
                    assert.strictEqual(dao.isModified(users[0]), false);
                    assert.strictEqual(dao.isDestroyed(users[0]), false);
                    assert.strictEqual(dao.isMutable(users[0]), false);
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                    assert.strictEqual(dao.hasModel(users[1]), true);
                    assert.strictEqual(dao.isNew(users[1]), false);
                    assert.strictEqual(dao.isModified(users[1]), false);
                    assert.strictEqual(dao.isDestroyed(users[1]), false);
                    assert.strictEqual(dao.isMutable(users[1]), false);
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Fetching multiple locked models should make them mutable', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUsersByIdList([1, 3], true);
                return dao.execute(query).then(function (users) {
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert.strictEqual(dao.hasModel(users[0]), true);
                    assert.strictEqual(dao.isNew(users[0]), false);
                    assert.strictEqual(dao.isModified(users[0]), false);
                    assert.strictEqual(dao.isDestroyed(users[0]), false);
                    assert.strictEqual(dao.isMutable(users[0]), true);
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                    assert.strictEqual(dao.hasModel(users[1]), true);
                    assert.strictEqual(dao.isNew(users[1]), false);
                    assert.strictEqual(dao.isModified(users[1]), false);
                    assert.strictEqual(dao.isDestroyed(users[1]), false);
                    assert.strictEqual(dao.isMutable(users[1]), true);
                });
            }).then(function () { return dao.release(); });
        });
    });
});
// INSERTING TESTS
// ================================================================================================
describe('DAO: inserting models', function () {
    it('Inserting a model should add it to the database', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var user = setup_1.User.parse({
                    id: 4, username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                });
                dao.insert(user);
                assert.strictEqual(dao.isSynchronized, false);
                assert.strictEqual(dao.hasModel(user), true);
                assert.strictEqual(dao.isNew(user), true);
                assert.strictEqual(dao.isModified(user), false);
                assert.strictEqual(dao.isDestroyed(user), false);
                return dao.sync().then(function (changes) {
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isSynchronized, true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(changes.length, 1);
                    assert.deepEqual(changes[0].current, user);
                    assert.strictEqual(changes[0].original, undefined);
                    var query = new setup_1.qFetchUserById(4);
                    return dao.execute(query).then(function (newUser) {
                        assert.deepEqual(user, newUser);
                    });
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Inserting multiple models should add them to the database', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var user1 = setup_1.User.parse({
                    id: 4, username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                });
                var user2 = setup_1.User.parse({
                    id: 5, username: 'Mark', createdOn: new Date(), updatedOn: new Date()
                });
                dao.insert(user1);
                dao.insert(user2);
                assert.strictEqual(dao.isSynchronized, false);
                return dao.sync().then(function (changes) {
                    assert.strictEqual(dao.isSynchronized, true);
                    assert.strictEqual(changes.length, 2);
                    assert.deepEqual(changes[0].current, user1);
                    assert.strictEqual(changes[0].original, undefined);
                    assert.deepEqual(changes[1].current, user2);
                    assert.strictEqual(changes[1].original, undefined);
                    var query = new setup_1.qFetchUsersByIdList([4, 5]);
                    return dao.execute(query).then(function (users) {
                        assert.strictEqual(users.length, 2);
                        assert.deepEqual(users[0], user1);
                        assert.deepEqual(users[1], user2);
                    });
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Inserting a non-model should throw an error', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var userSeed = {
                    id: 4, username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                };
                assert.throws(function () {
                    dao.insert(userSeed);
                }, Error);
            }).then(function () { return dao.release(); });
        });
    });
    it('Inserting the same model twice should thrown an error', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var user = setup_1.User.parse({
                    id: 4, username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                });
                assert.throws(function () {
                    dao.insert(user);
                    dao.insert(user);
                }, Error);
            }).then(function () { return dao.release('rollback'); });
        });
    });
    it('Inserting a deleted model should throw an error', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1, true);
                return dao.execute(query).then(function (user) {
                    dao.destroy(user);
                    assert.throws(function () {
                        dao.insert(user);
                    }, Error);
                });
            }).then(function () { return dao.release('rollback'); });
        });
    });
});
// DELETING TESTS
// ================================================================================================
describe('DAO: Deleting Models', function () {
    it('Deleting a model should remove it from the database', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1, true);
                return dao.execute(query).then(function (user) {
                    dao.destroy(user);
                    assert.strictEqual(dao.isSynchronized, false);
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isDestroyed(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    return dao.sync().then(function (changes) {
                        assert.strictEqual(dao.hasModel(user), false);
                        assert.strictEqual(dao.isSynchronized, true);
                        assert.strictEqual(changes.length, 1);
                        assert.strictEqual(changes[0].current, undefined);
                        assert.deepEqual(changes[0].original, user);
                        return dao.execute(query).then(function (newUser) {
                            assert.strictEqual(newUser, undefined);
                        });
                    });
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Deleting multiple models should remove them from the database', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUsersByIdList([1, 2, 3], true);
                return dao.execute(query1).then(function (users) {
                    dao.destroy(users[0]);
                    dao.destroy(users[2]);
                    assert.strictEqual(dao.isSynchronized, false);
                    return dao.sync().then(function (changes) {
                        assert.strictEqual(dao.isSynchronized, true);
                        assert.strictEqual(changes.length, 2);
                        assert.strictEqual(changes[0].current, undefined);
                        assert.deepEqual(changes[0].original, users[0]);
                        assert.strictEqual(changes[1].current, undefined);
                        assert.deepEqual(changes[1].original, users[2]);
                        var query2 = new setup_1.qFetchUsersByIdList([1, 2, 3]);
                        return dao.execute(query2).then(function (newUsers) {
                            assert.strictEqual(newUsers.length, 1);
                            assert.deepEqual(newUsers[0], users[1]);
                        });
                    });
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Deleting a non-mutable model should throw an error', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1);
                return dao.execute(query).then(function (user) {
                    assert.throws(function () {
                        dao.destroy(user);
                    }, Error);
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Deleting a model twice should throw an error', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1, true);
                return dao.execute(query).then(function (user) {
                    assert.throws(function () {
                        dao.destroy(user);
                        dao.destroy(user);
                    }, Error);
                });
            }).then(function () { return dao.release('rollback'); });
        });
    });
    it('Deleting an inserted model should result in no changes', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var user = setup_1.User.parse({
                    id: 4, username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                });
                dao.insert(user);
                dao.destroy(user);
                assert.strictEqual(dao.hasModel(user), false);
                assert.strictEqual(dao.isSynchronized, true);
                dao.sync().then(function (changes) {
                    assert.strictEqual(changes.length, 0);
                });
            }).then(function () { return dao.release('rollback'); });
        });
    });
});
// UPDATING TESTS
// ================================================================================================
describe('DAO: Updating Models', function () {
    it('Updating a model should update it in the database', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUserById(1, true);
                return dao.execute(query1).then(function (user) {
                    user.username = 'Test';
                    assert.strictEqual(dao.isSynchronized, false);
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), true);
                    return dao.sync().then(function (changes) {
                        assert.strictEqual(dao.hasModel(user), true);
                        assert.strictEqual(dao.isSynchronized, true);
                        assert.strictEqual(changes.length, 1);
                        assert.strictEqual(changes[0].current, user);
                        assert.strictEqual(changes[0].current['username'], 'Test');
                        assert.strictEqual(changes[0].original.id, user.id);
                        assert.strictEqual(changes[0].original['username'], 'Irakliy');
                        var query2 = new setup_1.qFetchUserById(1);
                        return dao.execute(query2).then(function (newUser) {
                            assert.deepEqual(newUser, user);
                            assert.strictEqual(newUser.username, 'Test');
                        });
                    });
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Updating a model should change updatedOn date', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUserById(1, true);
                return dao.execute(query1).then(function (user) {
                    user.username = 'Test';
                    return dao.sync().then(function (changes) {
                        var original = changes[0].original;
                        var current = changes[0].current;
                        assert.ok(original.updatedOn.valueOf() < current.updatedOn.valueOf());
                    });
                });
            }).then(function () { return dao.release(); });
        });
    });
    it('Multiple changes should be persisted in the database', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUsersByIdList([1, 2, 3], true);
                return dao.execute(query1).then(function (users) {
                    dao.destroy(users[0]);
                    dao.destroy(users[2]);
                    var user = setup_1.User.parse({
                        id: 4, username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                    });
                    dao.insert(user);
                    users[1].username = 'Test';
                    return dao.sync().then(function (changes) {
                        assert.strictEqual(changes.length, 4);
                        var query2 = new setup_1.qFetchUsersByIdList([1, 2, 3, 4, 5]);
                        return dao.execute(query2).then(function (users2) {
                            assert.strictEqual(users2.length, 2);
                            assert.strictEqual(users2[0].username, 'Test');
                            assert.strictEqual(users2[1].username, 'Katie');
                        });
                    });
                });
            }).then(function () { return dao.release(); });
        });
    });
});
// LIFECYCLE TESTS
// ================================================================================================
describe('DAO: Lifecycle Tests', function () {
    it('Starting a transaction should put Dao in transaction state', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                assert.strictEqual(dao.isActive, true);
                assert.strictEqual(dao.inTransaction, false);
                assert.strictEqual(dao.isSynchronized, true);
                return dao.startTransaction()
                    .then(function () {
                    assert.strictEqual(dao.isActive, true);
                    assert.strictEqual(dao.inTransaction, true);
                    assert.strictEqual(dao.isSynchronized, true);
                });
            }).then(function () { return dao.release('rollback'); });
        });
    });
    it('Releasing an uncommitted Dao should throw an error', function () {
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                return dao.startTransaction().then(function () {
                    return dao.release()
                        .then(function () {
                        assert.fail();
                    })
                        .catch(function (error) {
                        assert.strictEqual(dao.isActive, false);
                        assert.strictEqual(dao.inTransaction, false);
                        assert.strictEqual(dao.isSynchronized, true);
                        assert.strictEqual(pg.db(settings).getPoolState().size, 1);
                        assert.strictEqual(pg.db(settings).getPoolState().available, 1);
                    });
                });
            });
        });
    });
    it('Syncing a Dao with commiting should put Dao in syncrhonized state', function () {
        assert.strictEqual(pg.db(settings).getPoolState().size, 1);
        assert.strictEqual(pg.db(settings).getPoolState().available, 1);
        var database = pg.db(settings);
        return database.connect().then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                assert.strictEqual(dao.isActive, true);
                assert.strictEqual(dao.inTransaction, false);
                assert.strictEqual(dao.isSynchronized, true);
                return dao.startTransaction().then(function () {
                    assert.strictEqual(dao.isActive, true);
                    assert.strictEqual(dao.inTransaction, true);
                    assert.strictEqual(dao.isSynchronized, true);
                    var query1 = new setup_1.qFetchUserById(1, true);
                    return dao.execute(query1).then(function (user) {
                        user.username = 'Test';
                        assert.strictEqual(dao.isActive, true);
                        assert.strictEqual(dao.inTransaction, true);
                        assert.strictEqual(dao.isSynchronized, false);
                        return dao.sync(true).then(function (changes) {
                            assert.strictEqual(changes.length, 1);
                            assert.strictEqual(dao.isActive, true);
                            assert.strictEqual(dao.inTransaction, false);
                            assert.strictEqual(dao.isSynchronized, true);
                            assert.strictEqual(pg.db(settings).getPoolState().size, 1);
                            assert.strictEqual(pg.db(settings).getPoolState().available, 0);
                            return dao.release().then(function (changes) {
                                assert.strictEqual(changes, undefined);
                                assert.strictEqual(dao.isActive, false);
                                assert.strictEqual(dao.inTransaction, false);
                                assert.strictEqual(dao.isSynchronized, true);
                                assert.strictEqual(pg.db(settings).getPoolState().size, 1);
                                assert.strictEqual(pg.db(settings).getPoolState().available, 1);
                            });
                        });
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=dao.js.map