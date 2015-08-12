// IMPORTS
// ================================================================================================
import * as assert from 'assert';
import * as pg from './../../index';
import { User, UserHandler, prepareDatabase, qFetchUserById, qFetchUsersByIdList } from './setup';

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

    test('Object query should return a single object', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1);
                return dao.execute(query).then((user) => {
                    assert(user.id === 1);
                    assert(user.username === 'Irakliy');
                });
            });
        });
    });

    test('Object query should return undefined on no rows', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(0);
                return dao.execute(query).then((user) => {
                    assert(user === undefined);
                });
            });
        });
    });

    test('List query should return an array of objects', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUsersByIdList([1,3]);
                return dao.execute(query).then((users) => {
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            });
        });
    });

    test('List query should return an empty array on no rows', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUsersByIdList([0]);
                return dao.execute(query).then((users) => {
                    assert(users.length === 0);
                });
            });
        });
    });

    test('Multiple queries should produce a named result object', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUserById(2);
                var query2 = new qFetchUsersByIdList([1,3]);
                return dao.execute([query1, query2]).then((results) => {
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
            });
        });
    });

    test('Multiple object queries should produce an array of objects', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUserById(1);
                var query2 = new qFetchUserById(2);
                var query3 = new qFetchUserById(3);
                return dao.execute([query1, query2, query3]).then((result) => {
                    var users: User[] = result[query1.name];
                    assert(users.length === 3);
                    assert(users[1].id === 2);
                    assert(users[1].username === 'Yason');
                });
            });
        });
    });

    test('Multiple list queries should produce an array of arrays', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUsersByIdList([1, 2]);
                var query2 = new qFetchUsersByIdList([3]);
                return dao.execute([query1, query2]).then((results) => {
                    var result: any[] = results[query1.name];
                    assert(result.length === 2);

                    var users1: User[] = result[0];
                    assert(users1.length === 2);
                    assert(users1[1].id === 2);
                    assert(users1[1].username === 'Yason');

                    var users2: User[] = result[1];
                    assert(users2.length === 1);
                    assert(users2[0].id === 3);
                    assert(users2[0].username === 'George');
                });
            });
        });
    });

    test('Object query without handler should produce an object', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 1;',
                    mask: 'object'
                };

                return dao.execute(query).then((user) => {
                    assert(user.id === 1);
                    assert(user.username === 'Irakliy');
                });
            });
        });
    });

    test('List query without handler should produce an array of objects', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = {
                    text: 'SELECT id, username FROM tmp_users WHERE id IN (1,2);',
                    mask: 'list'
                };

                return dao.execute(query).then((users) => {
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert(users[1].id === 2);
                    assert(users[1].username === 'Yason');
                });
            });
        });
    });

    test('Unnamed object queries should aggregate into undefined result', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 1;',
                    mask: 'object'
                };

                var query2 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 3;',
                    mask: 'object'
                };

                return dao.execute([query1, query2]).then((results) => {
                    var users = results[<any>undefined];
                    assert(users.length === 2);
                    assert(users[0].id === 1);
                    assert(users[0].username === 'Irakliy');
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            });
        });
    });

    test('Unnamed mixed queries should aggregate into undefined result', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 1;',
                    mask: 'object'
                };

                var query2 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id IN (2, 3);',
                    mask: 'list'
                };

                return dao.execute([query1, query2]).then((results) => {
                    var result = results[<any>undefined];
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
            });
        });
    });

    test('Multiple object queries should not produce an array with holes', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUserById(1);
                var query2 = new qFetchUserById(0);
                var query3 = new qFetchUserById(3);
                return dao.execute([query1, query2, query3]).then((result) => {
                    var users: User[] = result[query1.name];
                    assert(users.length === 2);
                    assert(users[1].id === 3);
                    assert(users[1].username === 'George');
                });
            });
        });
    });

    test('Multiple list queries should produce an array for every query', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = new qFetchUsersByIdList([1, 2]);
                var query2 = new qFetchUsersByIdList([0]);
                var query3 = new qFetchUsersByIdList([3]);
                return dao.execute([query1, query2, query3]).then((results) => {
                    var result: any[] = results[query1.name];
                    assert(result.length === 3);

                    var users1: User[] = result[0];
                    assert(users1.length === 2);
                    assert(users1[1].id === 2);
                    assert(users1[1].username === 'Yason');

                    assert(result[1].length === 0);

                    var users3: User[] = result[2];
                    assert(users3.length === 1);
                    assert(users3[0].id === 3);
                    assert(users3[0].username === 'George');
                });
            });
        });
    });

    test('A non-result query should produce no results', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = {
                    text: `UPDATE tmp_users SET username = 'irakliy' WHERE username = 'irakliy';`
                };
                return dao.execute(query).then((result) => {
                    assert.equal(result, undefined);
                });
            });
        });
    });

    test('Multiple non-result queries should produce no results', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = {
                    text: `UPDATE tmp_users SET username = 'irakliy' WHERE username = 'irakliy';`
                };
                return dao.execute([query, query]).then((results) => {
                    assert.equal(results, undefined);
                });
            });
        });
    });

    test('Un-named non-result queries should not produce holes in result array', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query1 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id = 1;',
                    mask: 'object'
                };

                var query2 = {
                    text: `UPDATE tmp_users SET username = 'irakliy' WHERE username = 'irakliy';`
                };

                var query3 = {
                    text: 'SELECT id, username FROM tmp_users WHERE id IN (2, 3);',
                    mask: 'list'
                };

                return dao.execute([query1, query2, query3]).then((results) => {
                    var result = results[<any>undefined];
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
            });
        });
    });
});

// DELETING TESTS
// ================================================================================================
describe('Data deleting tests', function () {

    test('Deleting a model should remove it from the database', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1, true);
                return dao.execute(query).then((user) => {

                    dao.destroy(user);
                    assert.strictEqual(dao.isSynchronized, false);
                    assert.strictEqual(dao.hasModel(user), true);
                    assert.strictEqual(dao.isDestroyed(user), true);
                    assert.strictEqual(dao.isNew(user), false);
                    assert.strictEqual(dao.isUpdated(user), false);

                    return dao.sync().then((changes) => {
                        assert.strictEqual(changes.length, 1);
                        var change = changes[0];
                        assert.strictEqual(change.current, undefined);
                        assert.deepEqual(change.original, user);
                        return dao.execute(query).then((newUser) => {
                            assert.strictEqual(newUser, undefined);
                        });
                    });
                });
            }).then(() => dao.release());
        });
    });

    test('Deleting a non-mutable model should throw an error', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1);
                return dao.execute(query).then((user) => {
                    assert.throws(() => {
                        dao.destroy(user);
                    }, assert.AssertionError);
                });
            }).then(() => dao.release());
        });
    });

    test('Deleting a model twice should throw an error', () => {
        return pg.connect(settings).then((dao) => {
            return prepareDatabase(dao).then(() => {
                var query = new qFetchUserById(1, true);
                return dao.execute(query).then((user) => {
                    assert.throws(() => {
                        dao.destroy(user);
                        dao.destroy(user);
                    }, assert.AssertionError);
                });
            }).then(() => dao.release());
        });
    });
});

// UPDATING TESTS
// ================================================================================================

// INSERTING TESTS
// ================================================================================================

// TRANSACTION TESTS
// ================================================================================================