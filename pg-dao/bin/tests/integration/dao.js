// IMPORTS
// ================================================================================================
var assert = require('assert');
var pg = require('./../../index');
var setup_1 = require('./setup');
// CONNECTION SETTINGS
// ================================================================================================
var settings = {
    host: 'localhost',
    port: 5432,
    user: 'credoadmin',
    password: 'e64FB=%KWL-]',
    database: 'credo'
};
// FETCHING TESTS
// ================================================================================================
describe('Data fetching tests', function () {
    test('Object query should return a single object', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1);
                return dao.execute(query).then(function (user) {
                    assert(user.id === 1);
                    assert(user.username === 'Irakliy');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Object query should return undefined on no rows', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(0);
                return dao.execute(query).then(function (user) {
                    assert(user === undefined);
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('List query should return an array of objects', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUsersByIdList([1, 3]);
                return dao.execute(query).then(function (users) {
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('List query should return an empty array on no rows', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUsersByIdList([0]);
                return dao.execute(query).then(function (users) {
                    assert(users.length === 0);
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Multiple queries should produce a named result object', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUserById(2);
                var query2 = new setup_1.qFetchUsersByIdList([1, 3]);
                return dao.execute([query1, query2]).then(function (results) {
                    var user = results[query1.name];
                    assert(user.id === 2);
                    assert(user.username === 'Yason');
                    var users = results[query2.name];
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Multiple object queries should produce an array of objects', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUserById(1);
                var query2 = new setup_1.qFetchUserById(2);
                var query3 = new setup_1.qFetchUserById(3);
                return dao.execute([query1, query2, query3]).then(function (result) {
                    var users = result[query1.name];
                    assert(users.length === 3);
                    assert(users[1].id === 2);
                    assert(users[1].username === 'Yason');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Multiple list queries should produce an array of arrays', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUsersByIdList([1, 2]);
                var query2 = new setup_1.qFetchUsersByIdList([3]);
                return dao.execute([query1, query2]).then(function (results) {
                    var result = results[query1.name];
                    assert(result.length === 2);
                    var users1 = result[0];
                    assert(users1.length === 2);
                    assert(users1[1].id === 2);
                    assert(users1[1].username === 'Yason');
                    var users2 = result[1];
                    assert(users2.length === 1);
                    assert(users2[0].id === 3);
                    assert(users2[0].username === 'George');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Object query without handler should produce an object', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 1;',
                    mask: 'object'
                };
                return dao.execute(query).then(function (user) {
                    assert(user.id === 1);
                    assert(user.username === 'Irakliy');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('List query without handler should produce an array of objects', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = {
                    text: 'SELECT id, username FROM tmp_users WHERE id IN (1,2);',
                    mask: 'list'
                };
                return dao.execute(query).then(function (users) {
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert(users[1].id === 2);
                    assert(users[1].username === 'Yason');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Unnamed object queries should aggregate into undefined result', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 1;',
                    mask: 'object'
                };
                var query2 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 3;',
                    mask: 'object'
                };
                return dao.execute([query1, query2]).then(function (results) {
                    var users = results[undefined];
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Unnamed mixed queries should aggregate into undefined result', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 1;',
                    mask: 'object'
                };
                var query2 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id IN (2, 3);',
                    mask: 'list'
                };
                return dao.execute([query1, query2]).then(function (results) {
                    var result = results[undefined];
                    var user = result[0];
                    assert(user.id === 1);
                    assert(user.username === 'Irakliy');
                    var users = result[1];
                    assert(users.length === 2);
                    assert(users[0].id === 2);
                    assert(users[0].username === 'Yason');
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Multiple object queries should not produce an array with holes', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUserById(1);
                var query2 = new setup_1.qFetchUserById(0);
                var query3 = new setup_1.qFetchUserById(3);
                return dao.execute([query1, query2, query3]).then(function (result) {
                    var users = result[query1.name];
                    assert(users.length === 2);
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Multiple list queries should produce an array for every query', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = new setup_1.qFetchUsersByIdList([1, 2]);
                var query2 = new setup_1.qFetchUsersByIdList([0]);
                var query3 = new setup_1.qFetchUsersByIdList([3]);
                return dao.execute([query1, query2, query3]).then(function (results) {
                    var result = results[query1.name];
                    assert(result.length === 3);
                    var users1 = result[0];
                    assert(users1.length === 2);
                    assert(users1[1].id === 2);
                    assert(users1[1].username === 'Yason');
                    assert(result[1].length === 0);
                    var users3 = result[2];
                    assert(users3.length === 1);
                    assert(users3[0].id === 3);
                    assert(users3[0].username === 'George');
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('A non-result query should produce no results', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = {
                    text: "UPDATE tmp_users SET username = 'irakliy' WHERE username = 'irakliy';"
                };
                return dao.execute(query).then(function (result) {
                    assert.equal(result, undefined);
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Multiple non-result queries should produce no results', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = {
                    text: "UPDATE tmp_users SET username = 'irakliy' WHERE username = 'irakliy';"
                };
                return dao.execute([query, query]).then(function (results) {
                    assert.equal(results, undefined);
                });
            }).then(function () { return dao.release(); });
            ;
        });
    });
    test('Un-named non-result queries should not produce holes in result array', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query1 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 1;',
                    mask: 'object'
                };
                var query2 = {
                    text: "UPDATE tmp_users SET username = 'irakliy' WHERE username = 'irakliy';"
                };
                var query3 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id IN (2, 3);',
                    mask: 'list'
                };
                return dao.execute([query1, query2, query3]).then(function (results) {
                    var result = results[undefined];
                    var user = result[0];
                    assert(user.id === 1);
                    assert(user.username === 'Irakliy');
                    var users = result[1];
                    assert(users.length === 2);
                    assert(users[0].id === 2);
                    assert(users[0].username === 'Yason');
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            }).then(function () { return dao.release(); });
        });
    });
});
// DELETING TESTS
// ================================================================================================
describe('Data deleting tests', function () {
    test('Deleting a model should remove it from the database', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1, true);
                return dao.execute(query).then(function (user) {
                    dao.destroy(user);
                    assert.strictEqual(dao.isSynchronized, false);
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isDestroyed(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isUpdated(user), false);
                    return dao.sync().then(function (changes) {
                        assert.strictEqual(changes.length, 1);
                        var change = changes[0];
                        assert.strictEqual(change.current, undefined);
                        assert.deepEqual(change.original, user);
                        return dao.execute(query).then(function (newUser) {
                            assert.strictEqual(newUser, undefined);
                        });
                    });
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Deleting a non-mutable model should throw an error', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1);
                return dao.execute(query).then(function (user) {
                    assert.throws(function () {
                        dao.destroy(user);
                    }, assert.AssertionError);
                });
            }).then(function () { return dao.release(); });
        });
    });
    test('Deleting a model twice should throw an error', function () {
        return pg.connect(settings).then(function (dao) {
            return setup_1.prepareDatabase(dao).then(function () {
                var query = new setup_1.qFetchUserById(1, true);
                return dao.execute(query).then(function (user) {
                    assert.throws(function () {
                        dao.destroy(user);
                        dao.destroy(user);
                    }, assert.AssertionError);
                });
            }).then(function () { return dao.release(true); });
        });
    });
});
// UPDATING TESTS
// ================================================================================================
// INSERTING TESTS
// ================================================================================================
// TRANSACTION TESTS
// ================================================================================================ 
//# sourceMappingURL=dao.js.map