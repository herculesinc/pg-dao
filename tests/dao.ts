// IMPORTS
// ================================================================================================
import * as assert from 'assert';
import * as pg from './../index';
import { PoolState, SessionOptions } from 'pg-io';
import { Dao } from './../lib/Dao'
import { User, prepareDatabase, qFetchUserById, qFetchUsersByIdList } from './setup';
import { settings } from './settings';

// CONNECTION SETTINGS
// ================================================================================================

interface Database {
    connect(options?: SessionOptions): Promise<Dao>;
    getPoolState(): PoolState;
}

// FETCHING TESTS
// ================================================================================================
describe('DAO: Fetching a Single Model', function () {

    it('Fetching a single model should added it to the store', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.fetchOne(User, {id: 1}).then((user) =>{
                    assert.strictEqual(user.id, '1');
                    assert.strictEqual(user.username, 'Irakliy');
                    assert.strictEqual(user.tags[0], 'tag1');
                    assert.strictEqual(user.tags[1], 'tag2');
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isMutable(user), false); 
                });
            }).then(() => dao.close());
        });
    });

    it('Fetching a locked model should make it mutable', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.fetchOne(User, {id: 1}, true).then((user) =>{
                    assert.strictEqual(user.id, '1');
                    assert.strictEqual(user.username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isMutable(user), true);
                });
            }).then(() => dao.close());
        });
    });
    
    it('Fetching the same model multiple times should return the same object', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.fetchOne(User, {id: 1}).then((user1) =>{
                    return dao.fetchOne(User, {id: 1}).then((user2) =>{
                        assert.strictEqual(user1, user2);
                    });
                });
            }).then(() => dao.close());
        });
    });
    
    it('Re-fetching model as mutable should make it mutable', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.fetchOne(User, {id: 1}).then((user1) =>{
                    assert.strictEqual(dao.isMutable(user1), false);
                    return dao.fetchOne(User, {id: 1}, true).then((user2) =>{
                        assert.strictEqual(user1, user2);
                        assert.strictEqual(dao.isMutable(user1), true);
                    });
                });
            }).then(() => dao.close());
        });
    });
    
    it('Fetching a single model with an invalid handler should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var nonHandler: any = {};
                return dao.fetchOne(nonHandler, {id: 1}).then((user) =>{
                    assert.fail();
                })
                .catch((reason) => {
                    assert.strictEqual(reason instanceof assert.AssertionError, false);
                    assert.strictEqual(reason instanceof Error, true);
                });
            }).then(() => dao.close());
        });
    });
    
    it('Fetching a single model with an invalid selector should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.fetchOne(User, {ids: 1}).then((user) =>{
                    assert.fail();
                })
                .catch((reason) => {
                    assert.strictEqual(reason instanceof assert.AssertionError, false);
                    assert.strictEqual(reason instanceof Error, true);
                });
            }).then(() => dao.close());
        });
    });
});

describe('DAO: Fetching Multiple Models', function () {

    it('Fetching multiple models should add them to the store', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.fetchAll(User, { id: [1, 3]}).then((users) => {
                    assert.strictEqual(users.length, 2);
                    
                    assert.strictEqual(users[0].id, '1');
                    assert.strictEqual(users[0].username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(users[0]), true);
                    assert.strictEqual(dao.isNew(users[0]), false);
                    assert.strictEqual(dao.isModified(users[0]), false);
                    assert.strictEqual(dao.isDestroyed(users[0]), false);
                    assert.strictEqual(dao.isMutable(users[0]), false);
                    
                    assert.strictEqual(users[1].id, '3');
                    assert.strictEqual(users[1].username, 'George');
                    assert.strictEqual(dao.hasModel(users[1]), true);
                    assert.strictEqual(dao.isNew(users[1]), false);
                    assert.strictEqual(dao.isModified(users[1]), false);
                    assert.strictEqual(dao.isDestroyed(users[1]), false);
                    assert.strictEqual(dao.isMutable(users[1]), false);
                });
            }).then(() => dao.close());
        });
    });
    
    it('Fetching multiple locked models should make them mutable', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.fetchAll(User, { id: [1, 3] }, true).then((users) => {
                    assert.strictEqual(users.length, 2);
                    
                    assert.strictEqual(users[0].id, '1');
                    assert.strictEqual(users[0].username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(users[0]), true);
                    assert.strictEqual(dao.isNew(users[0]), false);
                    assert.strictEqual(dao.isModified(users[0]), false);
                    assert.strictEqual(dao.isDestroyed(users[0]), false);
                    assert.strictEqual(dao.isMutable(users[0]), true);
                    
                    assert.strictEqual(users[1].id, '3');
                    assert.strictEqual(users[1].username, 'George');
                    assert.strictEqual(dao.hasModel(users[1]), true);
                    assert.strictEqual(dao.isNew(users[1]), false);
                    assert.strictEqual(dao.isModified(users[1]), false);
                    assert.strictEqual(dao.isDestroyed(users[1]), false);
                    assert.strictEqual(dao.isMutable(users[1]), true);
                });
            }).then(() => dao.close());
        });
    });
    
    it('Fetching multiple model with an invalid handler should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var nonHandler: any = {};
                return dao.fetchAll(nonHandler, {id: [1, 3] }).then((user) =>{
                    assert.fail();
                })
                .catch((reason) => {
                    assert.strictEqual(reason instanceof assert.AssertionError, false);
                    assert.strictEqual(reason instanceof Error, true);
                });
            }).then(() => dao.close());
        });
    });
    
    it('Fetching a single model with an invalid selector should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.fetchAll(User, { ids: 1 }).then((user) =>{
                    assert.fail();
                })
                .catch((reason) => {
                    assert.strictEqual(reason instanceof assert.AssertionError, false);
                    assert.strictEqual(reason instanceof Error, true);
                });
            }).then(() => dao.close());
        });
    });
});

describe('DAO: Fetching Models via execute() method', function () {

    it('Fetching a single model should added it to the store', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1);
                return dao.execute(query).then((user) => {
                    assert.strictEqual(user.id, '1');
                    assert.strictEqual(user.username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isMutable(user), false);
                });
            }).then(() => dao.close());
        });
    });

    it('Fetching a locked model should make it mutable', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1, true);
                return dao.execute(query).then((user) => {
                    assert.strictEqual(user.id, '1');
                    assert.strictEqual(user.username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isMutable(user), true);
                });
            }).then(() => dao.close());
        });
    });

    it('Fetching multiple models should add them to the store', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUsersByIdList([1, 3]);
                return dao.execute(query).then((users) => {
                    assert.strictEqual(users.length, 2);
                    
                    assert.strictEqual(users[0].id, '1');
                    assert.strictEqual(users[0].username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(users[0]), true);
                    assert.strictEqual(dao.isNew(users[0]), false);
                    assert.strictEqual(dao.isModified(users[0]), false);
                    assert.strictEqual(dao.isDestroyed(users[0]), false);
                    assert.strictEqual(dao.isMutable(users[0]), false);
                    
                    assert.strictEqual(users[1].id, '3');
                    assert.strictEqual(users[1].username, 'George');
                    assert.strictEqual(dao.hasModel(users[1]), true);
                    assert.strictEqual(dao.isNew(users[1]), false);
                    assert.strictEqual(dao.isModified(users[1]), false);
                    assert.strictEqual(dao.isDestroyed(users[1]), false);
                    assert.strictEqual(dao.isMutable(users[1]), false);
                });
            }).then(() => dao.close());
        });
    });
    
    it('Fetching multiple locked models should make them mutable', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUsersByIdList([1, 3], true);
                return dao.execute(query).then((users) => {
                    assert.strictEqual(users.length, 2);
                    
                    assert.strictEqual(users[0].id, '1');
                    assert.strictEqual(users[0].username, 'Irakliy');
                    assert.strictEqual(dao.hasModel(users[0]), true);
                    assert.strictEqual(dao.isNew(users[0]), false);
                    assert.strictEqual(dao.isModified(users[0]), false);
                    assert.strictEqual(dao.isDestroyed(users[0]), false);
                    assert.strictEqual(dao.isMutable(users[0]), true);
                    
                    assert.strictEqual(users[1].id, '3');
                    assert.strictEqual(users[1].username, 'George');
                    assert.strictEqual(dao.hasModel(users[1]), true);
                    assert.strictEqual(dao.isNew(users[1]), false);
                    assert.strictEqual(dao.isModified(users[1]), false);
                    assert.strictEqual(dao.isDestroyed(users[1]), false);
                    assert.strictEqual(dao.isMutable(users[1]), true);
                });
            }).then(() => dao.close());
        });
    });
    
    it('Fetching the same model multiple times should return the same object', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1);
                return dao.execute(query).then((user1) => {
                    return  dao.execute(query).then((user2) => {
                        assert.strictEqual(user1, user2);
                    });
                });
            }).then(() => dao.close());
        });
    });
    
    it('Re-fetching model as mutable should make it mutable', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUserById(1);
                var query2 = new qFetchUserById(1, true);
                
                return dao.execute(query1).then((user1) => {
                    assert.strictEqual(dao.isMutable(user1), false);
                    return  dao.execute(query2).then((user2) => {
                        assert.strictEqual(user1, user2);
                        assert.strictEqual(dao.isMutable(user1), true);
                    });
                });
            }).then(() => dao.close());
        });
    });
});

// FETCHING TESTS
// ================================================================================================
describe('DAO: creating models', function () {

    it('Creating a new model should create a model with new ID', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.create<User>(User, { username: 'newuser' }).then((user) =>{
                    assert.strictEqual(user.id, '100');
                    assert.strictEqual(user.username, 'newuser');
                    assert.strictEqual(user.createdOn instanceof Date, true);
                    assert.strictEqual(user.updatedOn instanceof Date, true);
                    assert.strictEqual(dao.hasModel(user), false); 
                });
            }).then(() => dao.close());
        });
    });

});

// INSERTING TESTS
// ================================================================================================
describe('DAO: inserting models', function () {

    it('Inserting a model should add it to the database', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {

                var user = User.parse({
                    id: '4', username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                });

                dao.insert(user);
                assert.strictEqual(dao.isSynchronized, false);
                assert.strictEqual(dao.hasModel(user), true);
                assert.strictEqual(dao.isNew(user), true);
                assert.strictEqual(dao.isModified(user), false);
                assert.strictEqual(dao.isDestroyed(user), false);

                return dao.sync().then(() => {
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isSynchronized, true);

                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isMutable(user), true);

                    var query = new qFetchUserById(4);
                    return dao.execute(query).then((newUser) => {
                        assert.deepEqual(user, newUser);
                    });
                });
            }).then(() => dao.close());
        });
    });
    
    it('Inserting multiple models should add them to the database', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {

                var user1 = User.parse({
                    id: '4', username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                });

                var user2 = User.parse({
                    id: '5', username: 'Mark', createdOn: new Date(), updatedOn: new Date()
                });

                dao.insert(user1);
                dao.insert(user2);
                assert.strictEqual(dao.isSynchronized, false);
                assert.strictEqual(dao.isMutable(user1), true);
                assert.strictEqual(dao.isMutable(user2), true);
                assert.strictEqual(dao.isNew(user1), true);
                assert.strictEqual(dao.isNew(user2), true);

                return dao.sync().then(() => {
                    assert.strictEqual(dao.isSynchronized, true);
                    assert.strictEqual(dao.isNew(user1), false);
                    assert.strictEqual(dao.isNew(user2), false);

                    var query = new qFetchUsersByIdList([4, 5]);
                    return dao.execute(query).then((users) => {
                        assert.strictEqual(users.length, 2);
                        assert.deepEqual(users[0], user1);
                        assert.deepEqual(users[1], user2);
                    });
                });
            }).then(() => dao.close());
        });
    });

    it('Inserting a non-model should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var userSeed = {
                    id: '4', username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                }
                assert.throws(() => {
                    dao.insert(userSeed);
                }, Error);
            }).then(() => dao.close());
        });
    });

    it('Inserting the same model twice should thrown an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var user = User.parse({
                    id: 4, username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                });
                assert.throws(() => {
                    dao.insert(user);
                    dao.insert(user);
                }, Error);
            }).then(() => dao.close('rollback'));
        });
    });

    it('Inserting a deleted model should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1, true);
                return dao.execute(query).then((user) => {
                    dao.destroy(user);
                    assert.throws(() => {
                        dao.insert(user);
                    }, Error);
                });
            }).then(() => dao.close('rollback'));
        });
    });
});

// DELETING TESTS
// ================================================================================================
describe('DAO: Deleting Models', function () {

    it('Deleting a model should remove it from the database', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1, true);
                return dao.execute(query).then((user) => {

                    dao.destroy(user);
                    assert.strictEqual(dao.isSynchronized, false);
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isDestroyed(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), false);
                    
                    return dao.sync().then(() => {
                        assert.strictEqual(dao.hasModel(user), false);
                        assert.strictEqual(dao.isSynchronized, true);

                        return dao.execute(query).then((newUser) => {
                            assert.strictEqual(newUser, undefined);
                        });
                    });
                });
            }).then(() => dao.close());
        });
    });

    it('Deleting multiple models should remove them from the database', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUsersByIdList([1,2,3], true);
                return dao.execute(query1).then((users) => {

                    dao.destroy(users[0]);
                    dao.destroy(users[2]);
                    assert.strictEqual(dao.isSynchronized, false);
                    
                    return dao.sync().then(() => {
                        assert.strictEqual(dao.isSynchronized, true);

                        var query2 = new qFetchUsersByIdList([1, 2, 3]);
                        return dao.execute(query2).then((newUsers) => {
                            assert.strictEqual(newUsers.length, 1);
                            assert.deepEqual(newUsers[0], users[1]);
                        });
                    });
                });
            }).then(() => dao.close());
        });
    });

    it('Deleting a immutable model should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1);
                return dao.execute(query).then((user) => {
                    assert.throws(() => {
                        dao.destroy(user);
                    }, Error);
                });
            }).then(() => dao.close());
        });
    });

    it('Deleting a model twice should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1, true);
                return dao.execute(query).then((user) => {
                    assert.throws(() => {
                        dao.destroy(user);
                        dao.destroy(user);
                    }, Error);
                });
            }).then(() => dao.close('rollback'));
        });
    });

    it('Deleting an inserted model should result in no changes', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var user = User.parse({
                    id: '4', username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                });

                dao.insert(user);
                dao.destroy(user);

                assert.strictEqual(dao.hasModel(user), false);
                assert.strictEqual(dao.isSynchronized, true);
            }).then(() => dao.close('rollback'));
        });
    });
    
    
});

// UPDATING TESTS
// ================================================================================================
describe('DAO: Updating Models', function () {

    it('Updating a model should update it in the database', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUserById(1, true);
                return dao.execute(query1).then((user) => {

                    user.username = 'Test';
                    user.tags[0] = 'testing';
                    assert.strictEqual(dao.isSynchronized, false);
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isDestroyed(user), false);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isModified(user), true);

                    return dao.sync().then(() => {
                        assert.strictEqual(dao.hasModel(user), true);
                        assert.strictEqual(dao.isSynchronized, true);

                        var query2 = new qFetchUserById(1);
                        return dao.execute(query2).then((newUser) => {
                            assert.deepEqual(newUser, user);
                            assert.strictEqual(newUser.username, 'Test');
                            assert.deepEqual(newUser.tags, ['testing', 'tag2']);
                        });
                    });
                });
            }).then(() => dao.close());
        });
    });
    
    it('Updating a model should change updatedOn date', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                const query1 = new qFetchUserById(1, true);
                return dao.execute(query1).then((user) => {
                    const originalUpdatedOn = user.updatedOn;
                    user.username = 'Test';
                    return dao.sync().then(() => {
                        if (pg.defaults.session.manageUpdatedOn) {
                            assert.ok(originalUpdatedOn.valueOf() < user.updatedOn.valueOf());
                        }
                        else {
                            assert.strictEqual(originalUpdatedOn.valueOf(), user.updatedOn.valueOf());
                        }
                    });
                });
            }).then(() => dao.close());
        });
    });

    it('Multiple changes should be persisted in the database', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUsersByIdList([1, 2, 3], true);
                return dao.execute(query1).then((users) => {
                    dao.destroy(users[0])
                    dao.destroy(users[2]);

                    var user = User.parse({
                        id: '4', username: 'Katie', createdOn: new Date(), updatedOn: new Date()
                    });
                    dao.insert(user);

                    users[1].username = 'Test';

                    return dao.sync().then(() => {
                        var query2 = new qFetchUsersByIdList([1, 2, 3, 4, 5]);
                        return dao.execute(query2).then((users2) => {
                            assert.strictEqual(users2.length, 2);
                            assert.strictEqual(users2[0].username, 'Test');
                            assert.strictEqual(users2[1].username, 'Katie');
                        });
                    });
                });
            }).then(() => dao.close());
        });
    });
    
    it('Syncing changes to immutable model should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1);
                return dao.execute(query).then((user) => {
                    user.username = 'Test123';
                    return dao.sync()
                        .then(() => {
                            if (pg.defaults.session.validateImmutability) {
                                assert.fail();
                            }
                            else {
                                return dao.close();
                            }
                        })
                        .catch((reason) => {
                            assert.ok(reason instanceof Error);
                            assert.strictEqual(reason instanceof assert.AssertionError, false);
                        });
                });
            });
        });
    });
});


// LIFECYCLE TESTS
// ================================================================================================
describe('DAO: Lifecycle Tests', function () {

    it('Starting a transaction should put Dao in transaction state', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {

                assert.strictEqual(dao.isActive, true);
                assert.strictEqual(dao.inTransaction, false);
                assert.strictEqual(dao.isSynchronized, true);

                return dao.startTransaction()
                    .then(() => {
                        assert.strictEqual(dao.isActive, true);
                        assert.strictEqual(dao.inTransaction, true);
                        assert.strictEqual(dao.isSynchronized, true);
                    });
            }).then(() => dao.close('rollback'));
        });
    });

    it('Closing an uncommitted Dao should throw an error', () => {
        const database: Database = new pg.Database(settings);
        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {
                return dao.startTransaction().then(() => {
                    return dao.close()
                        .then(() => {
                            assert.fail();
                        })
                        .catch((error) => {
                            assert.strictEqual(dao.isActive, false);
                            assert.strictEqual(dao.inTransaction, false);
                            assert.strictEqual(dao.isSynchronized, true);
                            assert.strictEqual(database.getPoolState().size, 1);
                            assert.strictEqual(database.getPoolState().available, 1);
                        });
                });
            });
        });
    });

    it('Closing Dao with commiting should put Dao in syncrhonized state', () => {

        const database: Database = new pg.Database(settings);

        assert.strictEqual(database.getPoolState().size, 0);
        assert.strictEqual(database.getPoolState().available, 0);

        return database.connect().then((dao) => {
            return prepareDatabase(dao).then(() => {

                assert.strictEqual(dao.isActive, true);
                assert.strictEqual(dao.inTransaction, false);
                assert.strictEqual(dao.isSynchronized, true);

                return dao.startTransaction().then(() => {
                    assert.strictEqual(dao.isActive, true);
                    assert.strictEqual(dao.inTransaction, true);
                    assert.strictEqual(dao.isSynchronized, true);

                    var query1 = new qFetchUserById(1, true);
                    return dao.execute(query1).then((user) => {

                        user.username = 'Test';

                        assert.strictEqual(dao.isActive, true);
                        assert.strictEqual(dao.inTransaction, true);
                        assert.strictEqual(dao.isSynchronized, false);

                        return dao.close('commit').then(() => {
                            assert.strictEqual(dao.isActive, false);
                            assert.strictEqual(dao.inTransaction, false);
                            assert.strictEqual(dao.isSynchronized, true);

                            assert.strictEqual(database.getPoolState().size, 1);
                            assert.strictEqual(database.getPoolState().available, 1);
                        });
                    });
                });
            });
        });
    });
});
