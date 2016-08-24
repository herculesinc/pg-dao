// IMPORTS
// ================================================================================================
import { expect } from 'chai';

import * as pg from './../index';
import { PoolState, SessionOptions } from 'pg-io';
import { Dao } from './../lib/Dao'
import { ModelQuery } from './../lib/Model';
import { User, prepareDatabase, qFetchUserById, qFetchUsersByIdList, initConst } from './setup';
import { ModelError, StoreError, SyncError } from './../lib/errors';
import { settings } from './settings';

// CONNECTION SETTINGS
// ================================================================================================

interface Database {
    connect(options?: SessionOptions): Promise<Dao>;
    getPoolState(): PoolState;
}

let connect: any;
let database: Database;
let dao: Dao;
let user1: any, user2: any, user3: any;
let user: User, otherUser: User, users: Array<User>;
let error: Error;
let query: ModelQuery<any>;
let seed1: any, seed2: any;
let ids: Array<number>;
let sIds: Array<string>;

describe('DAO;', () => {
    before(() => {
        database = new pg.Database(settings);
    });

    beforeEach(done => {
        user1 = initConst.user1;
        user2 = initConst.user2;
        user3 = initConst.user3;

        connect = database.connect()
            .then(result => {
                dao = result;
                return prepareDatabase(dao);
            })
            .then(done)
            .catch(done);
    });

    beforeEach(() => {
        seed1 = {
            id       : '4',
            username : 'Katie',
            createdOn: new Date(),
            updatedOn: new Date()
        };
        seed2 = {
            id       : '5',
            username : 'Mark',
            createdOn: new Date(),
            updatedOn: new Date()
        };
    });

    afterEach(done => {
        if (dao.isActive) {
            dao.close(dao.isSynchronized ? 'commit' : 'rollback')
                .then(done)
                .catch(done);
        } else {
            done();
        }
    });

    describe('DAO: Fetching a Single Model', () => {
        describe('Fetching a single model should added it to the store', () => {
            beforeEach(done => {
                dao.fetchOne(User, {id: user1.id})
                    .then(result => {
                        user = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return correct user', () => {
                expect(user.id).to.equal(user1.id);
                expect(user.username).to.equal(user1.username);
                expect(user.tags).to.deep.equal(user1.tags);
            });

            it('dao should have user model', () => {
                expect(dao.hasModel(user)).to.be.true;
            });

            it('model should not be new', () => {
                expect(dao.isNew(user)).to.be.false;
            });

            it('model should not be modified', () => {
                expect(dao.isModified(user)).to.be.false;
            });

            it('model should not be destroyed', () => {
                expect(dao.isDestroyed(user)).to.be.false;
            });

            it('model should not be mutable', () => {
                expect(dao.isMutable(user)).to.be.false;
            });
        });

        describe('Fetching a locked model should make it mutable', () => {
            beforeEach(done => {
                dao.fetchOne(User, {id: user1.id}, true)
                    .then(result => {
                        user = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return correct user', () => {
                expect(user.id).to.equal(user1.id);
                expect(user.username).to.equal(user1.username);
                expect(user.tags).to.deep.equal(user1.tags);
            });

            it('dao should have user model', () => {
                expect(dao.hasModel(user)).to.be.true;
            });

            it('model should not be new', () => {
                expect(dao.isNew(user)).to.be.false;
            });

            it('model should not be modified', () => {
                expect(dao.isModified(user)).to.be.false;
            });

            it('model should not be destroyed', () => {
                expect(dao.isDestroyed(user)).to.be.false;
            });

            it('model should be mutable', () => {
                expect(dao.isMutable(user)).to.be.true;
            });
        });

        describe('Fetching the same model multiple times should return the same object', () => {
            beforeEach(done => {
                dao.fetchOne(User, {id: user1.id})
                    .then(result => {
                        user = result;
                        return dao.fetchOne(User, {id: user1.id});
                    })
                    .then(result => {
                        otherUser = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return correct user', () => {
                expect(user.id).to.equal(user1.id);
                expect(user.username).to.equal(user1.username);
                expect(user.tags).to.deep.equal(user1.tags);
            });

            it('both users should be equal', () => {
                expect(user).to.equal(otherUser);
            });
        });

        describe('Re-fetching model as mutable should make it mutable', () => {
            beforeEach(done => {
                dao.fetchOne(User, {id: user1.id})
                    .then(result => {
                        user = result;
                        return dao.fetchOne(User, {id: user1.id}, true);
                    })
                    .then(result => {
                        otherUser = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return correct user', () => {
                expect(user.id).to.equal(user1.id);
                expect(user.username).to.equal(user1.username);
                expect(user.tags).to.deep.equal(user1.tags);
            });

            it('both users should be equal', () => {
                expect(user).to.equal(otherUser);
            });

            it('model should be mutable', () => {
                expect(dao.isMutable(user)).to.be.true;
                expect(dao.isMutable(otherUser)).to.be.true;
            });
        });

        // ERRORS
        describe('Fetching a single model with an invalid handler should throw an error', () => {
            beforeEach(done => {
                dao.fetchOne({} as any, {id: user1.id})
                    .then(() => {
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('error should be instance of ModelError', () => {
                expect(error).to.be.instanceof(ModelError);
            });

            it('should return \'Cannot fetch a model: model handler is invalid\' message', () => {
                expect(error.message).to.equal('Cannot fetch a model: model handler is invalid');
            });
        });

        describe('Fetching a single model with an invalid selector should throw an error', () => {
            beforeEach(done => {
                dao.fetchOne(User, {ids: user1.id})
                    .then(() => {
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('error should be instance of ModelError', () => {
                expect(error).to.be.instanceof(ModelError);
            });

            it('should return \'Cannot build a fetch query: model selector and schema are incompatible\' message', () => {
                expect(error.message).to.equal('Cannot build a fetch query: model selector and schema are incompatible');
            });
        });
    });

    describe('DAO: Fetching Multiple Models', () => {
        describe('Fetching multiple models should add them to the store', () => {
            beforeEach(done => {
                dao.fetchAll(User, {id: [user1.id, user3.id]})
                    .then(result => {
                        users = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return two users', () => {
                expect(users.length).to.equal(2);
            });

            it('should return users with expected id', () => {
                expect([user1.id, user3.id]).to.include(users[0].id);
                expect([user1.id, user3.id]).to.include(users[1].id);
            });

            it('dao should have both user models', () => {
                expect(dao.hasModel(users[0])).to.be.true;
                expect(dao.hasModel(users[1])).to.be.true;
            });

            it('dao should have expected properties for all users', () => {
                users.map(u => {
                    expect(dao.isNew(u)).to.be.false;
                    expect(dao.isModified(u)).to.be.false;
                    expect(dao.isDestroyed(u)).to.be.false;
                    expect(dao.isMutable(u)).to.be.false;
                });
            });
        });

        describe('Fetching multiple locked models should make them mutable', () => {
            beforeEach(done => {
                dao.fetchAll(User, {id: [user1.id, user3.id]}, true)
                    .then(result => {
                        users = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return two users', () => {
                expect(users.length).to.equal(2);
            });

            it('should return users with expected id', () => {
                expect([user1.id, user3.id]).to.include(users[0].id);
                expect([user1.id, user3.id]).to.include(users[1].id);
                expect(users[0].id).to.not.equal(users[1].id);
            });

            it('dao should have both user models', () => {
                expect(dao.hasModel(users[0])).to.be.true;
                expect(dao.hasModel(users[1])).to.be.true;
            });

            it('dao should have expected properties for all users', () => {
                users.map(u => {
                    expect(dao.isNew(u)).to.be.false;
                    expect(dao.isModified(u)).to.be.false;
                    expect(dao.isDestroyed(u)).to.be.false;
                    expect(dao.isMutable(u)).to.be.true;
                });
            });
        });

        // ERRORS
        describe('Fetching multiple model with an invalid handler should throw an error', () => {
            beforeEach(done => {
                dao.fetchAll({} as any, {id: [user1.id, user3.id]}, true)
                    .then(() => {
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('error should be instance of ModelError', () => {
                expect(error).to.be.instanceof(ModelError);
            });

            it('should return \'Cannot fetch models: model handler is invalid\' message', () => {
                expect(error.message).to.equal('Cannot fetch models: model handler is invalid');
            });
        });

        describe('Fetching a single model with an invalid selector should throw an error', () => {
            beforeEach(done => {
                dao.fetchAll(User, {ids: [user1.id, user3.id]})
                    .then(() => {
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('error should be instance of ModelError', () => {
                expect(error).to.be.instanceof(ModelError);
            });

            it('should return \'Cannot build a fetch query: model selector and schema are incompatible\' message', () => {
                expect(error.message).to.equal('Cannot build a fetch query: model selector and schema are incompatible');
            });
        });
    });

    describe('DAO: Fetching Models via execute() method', () => {
        describe('Fetching a single model should added it to the store', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return correct user', () => {
                expect(user.id).to.equal(user1.id);
                expect(user.username).to.equal(user1.username);
                expect(user.tags).to.deep.equal(user1.tags);
            });

            it('dao should have user model', () => {
                expect(dao.hasModel(user)).to.be.true;
            });

            it('dao should have expected properties for user', () => {
                expect(dao.isNew(user)).to.be.false;
                expect(dao.isModified(user)).to.be.false;
                expect(dao.isDestroyed(user)).to.be.false;
                expect(dao.isMutable(user)).to.be.false;
            });
        });

        describe('Fetching a locked model should make it mutable', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id, true);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return correct user', () => {
                expect(user.id).to.equal(user1.id);
                expect(user.username).to.equal(user1.username);
                expect(user.tags).to.deep.equal(user1.tags);
            });

            it('dao should have user model', () => {
                expect(dao.hasModel(user)).to.be.true;
            });

            it('dao should have expected properties for user', () => {
                expect(dao.isNew(user)).to.be.false;
                expect(dao.isModified(user)).to.be.false;
                expect(dao.isDestroyed(user)).to.be.false;
                expect(dao.isMutable(user)).to.be.true;
            });
        });

        describe('Fetching multiple models should add them to the store', () => {
            beforeEach(done => {
                sIds = [user1.id, user2.id];
                ids = sIds.map(Number);
                query = new qFetchUsersByIdList(ids);

                dao.execute(query)
                    .then(result => {
                        users = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return two users', () => {
                expect(users.length).to.equal(2);
            });

            it('should return users with expected id', () => {
                expect(sIds).to.include(users[0].id);
                expect(sIds).to.include(users[1].id);
            });

            it('dao should have both user models', () => {
                expect(dao.hasModel(users[0])).to.be.true;
                expect(dao.hasModel(users[1])).to.be.true;
            });

            it('dao should have expected properties for all users', () => {
                users.map(u => {
                    expect(dao.isNew(u)).to.be.false;
                    expect(dao.isModified(u)).to.be.false;
                    expect(dao.isDestroyed(u)).to.be.false;
                    expect(dao.isMutable(u)).to.be.false;
                });
            });
        });

        describe('Fetching multiple locked models should make them mutable', () => {
            beforeEach(done => {
                sIds = [user1.id, user2.id];
                ids = sIds.map(Number);
                query = new qFetchUsersByIdList(ids, true);

                dao.execute(query)
                    .then(result => {
                        users = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return two users', () => {
                expect(users.length).to.equal(2);
            });

            it('should return users with expected id', () => {
                expect(sIds).to.include(users[0].id);
                expect(sIds).to.include(users[1].id);
            });

            it('dao should have both user models', () => {
                expect(dao.hasModel(users[0])).to.be.true;
                expect(dao.hasModel(users[1])).to.be.true;
            });

            it('dao should have expected properties for all users', () => {
                users.map(u => {
                    expect(dao.isNew(u)).to.be.false;
                    expect(dao.isModified(u)).to.be.false;
                    expect(dao.isDestroyed(u)).to.be.false;
                    expect(dao.isMutable(u)).to.be.true;
                });
            });
        });

        describe('Fetching the same model multiple times should return the same object', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        return dao.execute(query);
                    })
                    .then(result => {
                        otherUser = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return correct user', () => {
                expect(user.id).to.equal(user1.id);
                expect(user.username).to.equal(user1.username);
                expect(user.tags).to.deep.equal(user1.tags);
            });

            it('both users should be equal', () => {
                expect(user).to.equal(otherUser);
            });
        });

        describe('Re-fetching model as mutable should make it mutable', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        query = new qFetchUserById(user1.id, true);
                        return dao.execute(query);
                    })
                    .then(result => {
                        otherUser = result;
                        done();
                    })
                    .catch(done);
            });

            it('should return correct user', () => {
                expect(user.id).to.equal(user1.id);
                expect(user.username).to.equal(user1.username);
                expect(user.tags).to.deep.equal(user1.tags);
            });

            it('both users should be equal', () => {
                expect(user).to.equal(otherUser);
            });

            it('model should be mutable', () => {
                expect(dao.isMutable(user)).to.be.true;
                expect(dao.isMutable(otherUser)).to.be.true;
            });
        });
    });

    describe('DAO: Creating models', () => {
        describe('Creating a new model should create a model with new ID', () => {
            beforeEach(done => {
                dao.create(User, { username: 'newuser' })
                    .then(result => {
                        user = result;
                        done();
                    })
                    .catch(done);
            });

            it('dao should not have user model', () => {
                expect(dao.hasModel(user)).to.be.false;
            });

            it('should return new user with id=\'100\'', () => {
                expect(user.id).to.equal('100');
            });

            it('should return new user with name=\'newuser\'', () => {
                expect(user.username).to.equal('newuser');
            });

            it('should return createdOn field', () => {
                expect(user.createdOn).to.be.an.instanceof(Date);
                expect(user.createdOn).to.exist
            });

            it('should return updatedOn field', () => {
                expect(user.updatedOn).to.be.an.instanceof(Date);
                expect(user.updatedOn).to.exist
            });
        });
    });

    describe('DAO: Inserting models', () => {
        describe('Inserting a model should add it to the database', () => {
            beforeEach(done => {
                user = User.parse(seed1);

                dao.insert(user);

                expect(dao.isSynchronized).to.be.false;

                dao.sync()
                    .then(done)
                    .catch(done);
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should have user model', () => {
                expect(dao.hasModel(user)).to.be.true;
            });

            it('model should not be new', () => {
                expect(dao.isNew(user)).to.be.false;
            });

            it('model should not be modified', () => {
                expect(dao.isModified(user)).to.be.false;
            });

            it('model should not be destroyed', () => {
                expect(dao.isDestroyed(user)).to.be.false;
            });

            it('model should be mutable', () => {
                expect(dao.isMutable(user)).to.be.true;
            });

            it('should add model to the database', done => {
                dao.execute(new qFetchUserById(seed1.id))
                    .then(dbUser => {
                        expect(dbUser).to.deep.equal(user);
                        expect(dbUser.id).to.equal(seed1.id);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Inserting multiple models should add them to the database', () => {
            beforeEach(done => {
                user = User.parse(seed1);
                otherUser = User.parse(seed2);

                dao.insert(user);
                dao.insert(otherUser);

                expect(dao.isSynchronized).to.be.false;

                dao.sync()
                    .then(done)
                    .catch(done);
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should have all users model', () => {
                expect(dao.hasModel(user)).to.be.true;
                expect(dao.hasModel(otherUser)).to.be.true;
            });

            it('should add models to the database', done => {
                ids = [Number(seed1.id), Number(seed2.id)];
                dao.execute(new qFetchUsersByIdList(ids))
                    .then(dbUsers => {
                        expect(dbUsers.length).to.equal(2);
                        expect(dbUsers[0]).to.deep.equal(user);
                        expect(dbUsers[1]).to.deep.equal(otherUser);
                        done();
                    })
                    .catch(done);
            });
        });

        // ERRORS
        describe('Inserting a non-model should throw an error', () => {
            beforeEach(done => {
                try {
                    dao.insert(seed1);
                    done('should throw an error');
                } catch (err) {
                    error = err;
                    done();
                }
            });

            it('error should be instance of ModelError', () => {
                expect(error).to.be.instanceof(ModelError);
            });

            it('should return \'Cannot insert a model: the model is invalid\' message', () => {
                expect(error.message).to.equal('Cannot insert a model: the model is invalid');
            });
        });

        describe('Inserting the same model twice should thrown an error', () => {
            beforeEach(done => {
                user = User.parse(seed1);
                dao.insert(user);

                try {
                    dao.insert(user);
                    done('should throw an error');
                } catch (err) {
                    error = err;
                    done();
                }
            });

            it('error should be instance of StoreError', () => {
                expect(error).to.be.instanceof(StoreError);
            });

            it('should return \'Cannot insert a mode: the model is already in the store\' message', () => {
                expect(error.message).to.equal('Cannot insert a mode: the model is already in the store');
            });
        });

        describe('Inserting a deleted model should throw an error', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id, true);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        dao.destroy(user);
                        dao.insert(user);
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('error should be instance of StoreError', () => {
                expect(error).to.be.instanceof(StoreError);
            });

            it('should return \'Cannot insert a model: the model has been destroyed\' message', () => {
                expect(error.message).to.equal('Cannot insert a model: the model has been destroyed');
            });
        });
    });

    describe('DAO: Deleting Models', () => {
        describe('Deleting a model should remove it from the database', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id, true);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        dao.destroy(user);

                        expect(dao.isSynchronized).to.be.false;

                        return dao.sync();
                    })
                    .then(done)
                    .catch(done);
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should not have user model', () => {
                expect(dao.hasModel(user)).to.be.false;
            });

            it('should delete model from the database', done => {
                dao.execute(query)
                    .then(dbUser => {
                        expect(dbUser).to.be.undefined;
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Deleting multiple models should remove them from the database', () => {
            beforeEach(done => {
                ids = [Number(user1.id), Number(user2.id), Number(user3.id)];
                query = new qFetchUsersByIdList(ids, true);

                dao.execute(query)
                    .then(result => {
                        users = result;
                        dao.destroy(users[0]);
                        dao.destroy(users[2]);

                        expect(dao.isSynchronized).to.be.false;

                        return dao.sync();
                    })
                    .then(done)
                    .catch(done);
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should not have user models for deleted users ', () => {
                expect(dao.hasModel(users[0])).to.be.false;
                expect(dao.hasModel(users[1])).to.be.true;
                expect(dao.hasModel(users[2])).to.be.false;
            });

            it('should delete model from the database', done => {
                dao.execute(query)
                    .then(dbUsers => {
                        expect(dbUsers.length).to.equal(1);
                        expect(dbUsers[0].id).to.equal(user2.id);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Deleting an inserted model should result in no changes', () => {
            beforeEach(() => {
                user = User.parse(seed1);

                dao.insert(user);
                dao.destroy(user);
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should not have user model', () => {
                expect(dao.hasModel(user)).to.be.false;
            });
        });

        // ERRORS
        describe('Deleting a immutable model should throw an error', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        dao.destroy(user);
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('error should be instance of StoreError', () => {
                expect(error).to.be.instanceof(StoreError);
            });

            it('should return \'Cannot destroy a model: the model is immutable\' message', () => {
                expect(error.message).to.equal('Cannot destroy a model: the model is immutable');
            });
        });

        describe('Deleting a model twice should throw an error', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id, true);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        dao.destroy(user);
                        dao.destroy(user);
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('error should be instance of StoreError', () => {
                expect(error).to.be.instanceof(StoreError);
            });

            it('should return \'Cannot destroy a model: the model has already been destroyed\' message', () => {
                expect(error.message).to.equal('Cannot destroy a model: the model has already been destroyed');
            });
        });
    });

    describe('DAO: Updating Models', () => {
        describe('Updating a model should update it in the database', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id, true);

                dao.execute(query)
                    .then(result => {
                        user = result;

                        user.username = 'Test';
                        user.tags[0] = 'testing';

                        expect(dao.isSynchronized).to.be.false;

                        return dao.sync();
                    })
                    .then(done)
                    .catch(done);
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should have user model', () => {
                expect(dao.hasModel(user)).to.be.true;
            });

            it('should update model in the database', done => {
                dao.execute(query)
                    .then(dbUser => {
                        expect(dbUser).to.exist;
                        expect(dbUser.id).to.equal(user1.id);
                        expect(dbUser.username).to.equal('Test');
                        expect(dbUser.tags).to.deep.equal(['testing', 'tag6']);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Updating a model should change updatedOn date', () => {
            let originalUpdatedOn: number;
            let timeout: number = 100;

            beforeEach(done => {
                query = new qFetchUserById(user1.id, true);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        originalUpdatedOn = user.updatedOn.valueOf();

                        query = new qFetchUserById(user1.id);
                    })
                    .then(() => {
                        return new Promise(resolve => {
                            setTimeout(() => {
                                user.username = 'Test';

                                expect(dao.isSynchronized).to.be.false;

                                resolve();
                            }, timeout);
                        })
                    })
                    .then(dao.sync.bind(dao))
                    .then(done)
                    .catch(done);
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should have user model', () => {
                expect(dao.hasModel(user)).to.be.true;
            });

            it('should update model in the database', done => {
                dao.execute(query)
                    .then(dbUser => {
                        expect(dbUser).to.exist;
                        expect(dbUser.id).to.equal(user1.id);
                        expect(dbUser.username).to.equal('Test');
                        expect(dbUser.tags).to.deep.equal(user1.tags);
                        done();
                    })
                    .catch(done);
            });

            it('should update updatedOn field', done => {
                dao.execute(query)
                    .then(dbUser => {
                        if (pg.defaults.session.manageUpdatedOn) {
                            expect(dbUser.updatedOn.valueOf()).to.be.above(originalUpdatedOn);
                            expect(dbUser.updatedOn.valueOf() - originalUpdatedOn).to.be.at.least(timeout);
                        } else {
                            expect(dbUser.updatedOn.valueOf()).to.equal(originalUpdatedOn);
                        }
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Multiple changes should be persisted in the database', () => {
            beforeEach(done => {
                sIds = [user1.id, user2.id, user3.id];
                ids = sIds.map(Number);
                query = new qFetchUsersByIdList(ids, true);

                dao.execute(query)
                    .then(result => {
                        users = result;

                        dao.destroy(users[0]);
                        dao.destroy(users[2]);

                        user = User.parse(seed1);

                        dao.insert(user);

                        users[1].username = 'Test';

                        expect(dao.isSynchronized).to.be.false;

                        return dao.sync();
                    })
                    .then(done)
                    .catch(done);
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should not have deleted models', () => {
                expect(dao.hasModel(users[0])).to.be.false;
                expect(dao.hasModel(users[2])).to.be.false;
            });

            it('dao should have updated and inserted models', () => {
                expect(dao.hasModel(users[1])).to.be.true;
                expect(dao.hasModel(user)).to.be.true;
            });

            it('should return only updated and inserted but not deleted', done => {
                sIds = [user1.id, user2.id, user3.id, seed1.id, seed2.id];
                ids = sIds.map(Number);
                query = new qFetchUsersByIdList(ids);

                dao.execute(query)
                    .then(dbUsers => {
                        expect(dbUsers.length).to.equal(2);

                        expect([user2.id, seed1.id]).to.include(dbUsers[0].id);
                        expect([user2.id, seed1.id]).to.include(dbUsers[1].id);

                        expect(dbUsers[0].username).to.equal('Test');
                        expect(dbUsers[1].username).to.equal(seed1.username);
                        done();
                    })
                    .catch(done);
            });
        });

        // ERRORS
        describe('Syncing changes to immutable model should throw an error', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id);

                dao.execute(query)
                    .then(result => {
                        user = result;
                        user.username = 'Test123';

                        return dao.sync();
                    })
                    .then(() => {
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('error should be instance of SyncError', () => {
                expect(error).to.be.instanceof(SyncError);
            });

            it('should return \'Change to immutable model detected\' message', () => {
                expect(error.message).to.equal('Change to immutable model detected');
            });
        });
    });

    describe('DAO: Lifecycle Tests', () => {

        it('dao should be active before start transaction', () => {
            expect(dao.isActive).to.be.true;
        });

        it('dao should be synchronized before start transaction', () => {
            expect(dao.isSynchronized).to.be.true;
        });

        it('dao should not be under transaction before start transaction', () => {
            expect(dao.inTransaction).to.be.false;
        });

        describe('Starting a transaction should put Dao in transaction state', () => {
            beforeEach(done => {
                dao.startTransaction()
                    .then(done)
                    .catch(done);
            });

            it('dao should be active after start transaction', () => {
                expect(dao.isActive).to.be.true;
            });

            it('dao should be synchronized after start transaction', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should be under transaction after start transaction', () => {
                expect(dao.inTransaction).to.be.true;
            });
        });

        describe('Closing Dao with commiting should put Dao in synchronized state', () => {
            beforeEach(done => {
                query = new qFetchUserById(user1.id, true);

                dao.startTransaction()
                    .then(() => {
                        return dao.execute(query);
                    })
                    .then(result => {
                        user = result;
                        user.username = 'Test';
                    })
                    .then(dao.close.bind(dao, 'commit'))
                    .then(done)
                    .catch(done);
            });

            it('dao should not be active', () => {
                expect(dao.isActive).to.be.false;
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should not be under transaction', () => {
                expect(dao.inTransaction).to.be.false;
            });

            it('database should have expected properties', () => {
                expect(database.getPoolState().size).to.equal(1);
                expect(database.getPoolState().available).to.equal(1);
            });
        });

        // ERRORS
        describe('Closing an uncommitted Dao should throw an error', () => {
            beforeEach(done => {
                dao.startTransaction()
                    .then(dao.close.bind(dao))
                    .then(() => {
                        done('should throw an error');
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('database should have expected properties', () => {
                expect(database.getPoolState().size).to.equal(1);
                expect(database.getPoolState().available).to.equal(1);
            });

            it('dao should not be active', () => {
                expect(dao.isActive).to.be.false;
            });

            it('dao should be synchronized', () => {
                expect(dao.isSynchronized).to.be.true;
            });

            it('dao should not be under transaction', () => {
                expect(dao.inTransaction).to.be.false;
            });

            it('error should be instance ofError', () => {
                expect(error).to.be.instanceof(Error);
            });

            it('should return \'Uncommitted transaction detected while closing the session\' message', () => {
                expect(error.message).to.equal('Uncommitted transaction detected while closing the session');
            });
        });
    });
});