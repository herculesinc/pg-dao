// IMPORTS
// ================================================================================================
import { expect } from 'chai';

import { Store } from './../lib/Store';
import { ModelError, StoreError, SyncError } from './../lib/errors';
import { defaults } from './../index'
import { User } from './setup';

let store: Store;
let changes: Array<any>;
let seed: any, seedAlt: any;
let seeds: Array<any>, newSeeds: Array<any>;
let users: Array<any>, user: User;
let original: User, current: User, fields: Array<string>;

describe('Store;', () => {
    beforeEach(() => {
        store = new Store(defaults.session);
        seed = { id: '1', username: 'Irakliy', createdOn: Date.now(), updatedOn: Date.now() };
        seedAlt = { id: '1', username: 'Yason', createdOn: Date.now(), updatedOn: Date.now() };
    });

    describe('Store: Initialization;', () => {
        describe('Empty store should have no changes', () => {
            beforeEach(() => {
                changes = store.getChanges();
            });

            it('store.getChanges() should return array', function () {
                expect(changes).to.be.instanceof(Array);
            });

            it('store.getChanges() should return empty array', function () {
                expect(changes).to.be.empty;
            });

            it('store.hasChanges should be false', function () {
                expect(store.hasChanges).to.be.false;
            });
        });
    });

    describe('Store: Loading Models;', () => {
        describe('Loading mutable models should populate the store;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], true);
                user = users[0];
            });

            it('store should have the model', function () {
                expect(store.has(user)).to.be.true;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model should not be new', function () {
                expect(store.isNew(user)).to.be.false;
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model should be mutable', function () {
                expect(store.isMutable(user)).to.be.true;
            });

            it('model store should have no changes', function () {
                expect(store.hasChanges).to.be.false;
            });
        });

        describe('Loading immutable models should populate the store;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], false);
                user = users[0];
            });

            it('store should have the model', function () {
                expect(store.has(user)).to.be.true;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model should not be new', function () {
                expect(store.isNew(user)).to.be.false;
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model should not be mutable', function () {
                expect(store.isMutable(user)).to.be.false;
            });

            it('model store should have no changes', function () {
                expect(store.hasChanges).to.be.false;
            });
        });

        describe('Reloading a model should update the original model data;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], false);
                user = users[0];
                store.load(User, [seedAlt], false);
            });

            it('user object should be updated', function () {
                expect(user.username).to.equal(seedAlt.username);
            });

            it('store should have the model', function () {
                expect(store.has(user)).to.be.true;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model should not be new', function () {
                expect(store.isNew(user)).to.be.false;
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model should not be mutable', function () {
                expect(store.isMutable(user)).to.be.false;
            });

            it('model store should have no changes', function () {
                expect(store.hasChanges).to.be.false;
            });
        });

        describe('Reloading an immutable model can make the model mutable;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], false);
                user = users[0];
                store.load(User, [seed], true);
            });

            it('store should have the model', function () {
                expect(store.has(user)).to.be.true;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model should not be new', function () {
                expect(store.isNew(user)).to.be.false;
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model should be mutable', function () {
                expect(store.isMutable(user)).to.be.true;
            });

            it('model store should have no changes', function () {
                expect(store.hasChanges).to.be.false;
            });
        });

        //ERRORS
        describe('Loading models with an invalid handler should throw an error;', () => {
            it('should throw an error', done => {
                try {
                    store.load(<any> {}, [seed], true);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(ModelError);
                    done();
                }
            });
        });

        describe('Loading an invalid model should throw an error;', () => {
            it('should throw an error', done => {
                try {
                    store.load(User, [{}], true);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(ModelError);
                    done();
                }
            });
        });
    });

    describe('Store: Updating models;', () => {
        beforeEach(() => {
            users = store.load(User, [seed], true);
            user = users[0];
            user.username = 'Test';
        });

        describe('Updating model property should mark it as modified;', () => {
            it('user object should be updated', function () {
                expect(user.username).to.not.equal(seed.username);
            });

            it('model should be modified', function () {
                expect(store.isModified(user)).to.be.true;
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model store should have changes', function () {
                expect(store.hasChanges).to.be.true;
            });
        });

        describe('Updating a model should produce store changes;', () => {
            beforeEach(() => {
                changes = store.getChanges();
                original = changes[0][0];
                current = changes[0][1];
                fields = changes[0][2];
            });

            it('model should be modified', function () {
                expect(store.isModified(user)).to.be.true;
            });

            it('model store should have changes', function () {
                expect(store.hasChanges).to.be.true;
            });

            it('model store should have 1 change', function () {
                expect(changes.length).to.equal(1);
            });

            it('original should be original user', function () {
                expect(original.id).to.equal(seed.id);
                expect(original.username).to.equal(seed.username);
                expect(original.createdOn).to.deep.equal(seed.createdOn);
                expect(original.updatedOn).to.deep.equal(seed.updatedOn);
            });

            it('current should be updated user', function () {
                expect(current.id).to.equal(seed.id);
                expect(current.username).to.equal('Test');
                expect(current.createdOn).to.deep.equal(seed.createdOn);
                expect(current.updatedOn).to.deep.equal(seed.updatedOn);
            });

            it('updated fields should contain \'username\'', function () {
                expect(fields).to.be.an('array');
                expect(fields.length).to.equal(1);
                expect(fields[0]).to.equal('username');
            });
        });

        //ERRORS
        describe('Reloading an updated model should throw an error;', () => {
            it('should throw an error', done => {
                try {
                    store.load(User, [seed], true);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });
    });

    describe('Store: Destroying models;', () => {
        beforeEach(() => {
            users = store.load(User, [seed], true);
            user = users[0];
            store.destroy(user);
        });

        describe('Destroying a model should mark it as destroyed;', () => {
            it('store should have the model', function () {
                expect(store.has(user)).to.be.true;
            });

            it('model should be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.true;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model should not be new', function () {
                expect(store.isNew(user)).to.be.false;
            });
        });

        describe('Destroying a model should produce store changes;', () => {
            beforeEach(() => {
                changes = store.getChanges();
                original = changes[0][0];
                current = changes[0][1];
                fields = changes[0][2];
            });

            it('model store should have changes', function () {
                expect(store.hasChanges).to.be.true;
            });

            it('model store should have 1 change', function () {
                expect(changes.length).to.equal(1);
            });

            it('original should be original user', function () {
                expect(original.id).to.equal(seed.id);
                expect(original.username).to.equal(seed.username);
                expect(original.createdOn).to.deep.equal(seed.createdOn);
                expect(original.updatedOn).to.deep.equal(seed.updatedOn);
            });

            it('current should be undefined', function () {
                expect(current).to.be.undefined;
            });

            it('updated fields should be undefined', function () {
                expect(fields).to.be.undefined;
            });

        });

        describe('Destroying an inserted model should remove it from the store;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                user = User.parse(seed);
                store.insert(user);
                store.destroy(user);
            });

            it('store should not have the model', function () {
                expect(store.has(user)).to.be.false;
            });
        });

        //ERRORS
        describe('Destroying an immutable model should throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                users = store.load(User, [seed], false);
                user = users[0];
            });

            it('should throw an error', done => {
                try {
                    store.destroy(user);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });

        describe('Destroying an non-loaded model should throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                user = User.parse(seed);
            });

            it('should throw an error', done => {
                try {
                    store.destroy(user);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });

        describe('Destroying a non-model should throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
            });

            it('should throw an error', done => {
                try {
                    store.destroy(seed);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(ModelError);
                    done();
                }
            });
        });

        describe('Destroying a non-model should throw an error;', () => {
            it('should throw an error', done => {
                try {
                    store.destroy(user);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });

        describe('Reloading a destroyed model should throw an error;', () => {
            it('should throw an error', done => {
                try {
                    store.load(User, [seed], true);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });
    });

    describe('Store: Inserting models;', () => {
        beforeEach(() => {
            user = User.parse(seed);
            store.insert(user);
        });

        describe('Inserting a model should mark it as new;', () => {
            it('store should have the model', function () {
                expect(store.has(user)).to.be.true;
            });

            it('model should be new', function () {
                expect(store.isNew(user)).to.be.true;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model should be mutable', function () {
                expect(store.isMutable(user)).to.be.true;
            });
        });

        describe('Inserting a model should produce store changes;', () => {
            beforeEach(() => {
                changes = store.getChanges();
                original = changes[0][0];
                current = changes[0][1];
                fields = changes[0][2];
            });

            it('model store should have changes', function () {
                expect(store.hasChanges).to.be.true;
            });

            it('model store should have 1 change', function () {
                expect(changes.length).to.equal(1);
            });

            it('original should be undefined', function () {
                expect(original).to.be.undefined;
            });

            it('current should be updated user', function () {
                expect(current).to.deep.equal(user);
            });

            it('updated fields should be undefined', function () {
                expect(fields).to.be.undefined;
            });
        });

        //ERRORS
        describe('Inserting a non-model should throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
            });

            it('should throw an error', done => {
                try {
                    store.insert(seed);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(ModelError);
                    done();
                }
            });
        });

        describe('Inserting an already loaded model throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                user = User.parse(seed);
                store.load(User, [seed], true);
            });

            it('should throw an error', done => {
                try {
                    store.insert(seed);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(ModelError);
                    done();
                }
            });
        });

        describe('Inserting a model twice should throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                user = User.parse(seed);
                store.insert(user);
            });

            it('should throw an error', done => {
                try {
                    store.insert(user);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });

        describe('Inserting a destroyed model should throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                users = store.load(User, [seed], true);
                user = users[0];
                store.destroy(user);
            });

            it('should throw an error', done => {
                try {
                    store.insert(user);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });

        describe('Loading an inserted model should throw an error;', () => {
            it('should throw an error', done => {
                try {
                    store.load(User, [seed], true);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });

        describe('Inserting a previously destroyed and synced model should throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                users = store.load(User, [seed], true);
                user = users[0];
                store.destroy(user);
                store.applyChanges(store.getChanges());
            });

            it('should throw an error', done => {
                try {
                    store.insert(user);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });
    });

    describe('Store: Cleaning models;', () => {
        beforeEach(() => {
            users = store.load(User, [seed], true);
            user = users[0];
        });

        describe('Cleaning an updated model should revert model changes', () => {
            beforeEach(() => {
                user.username = 'Test';
                store.clean(user);
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model store should have no changes', function () {
                expect(store.hasChanges).to.be.false;
            });

            it('\'username\' should not be updated', function () {
                expect(user.username).to.equal(seed.username);
            });
        });

        describe('Cleaning an updated model should revert model changes', () => {
            beforeEach(() => {
                store.destroy(user);
                store.clean(user);
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model store should have no changes', function () {
                expect(store.hasChanges).to.be.false;
            });
        });

        describe('Cleaning an inserted model should remove the model from the store', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                user = User.parse(seed);
                store.insert(user);
                store.clean(user);
            });

            it('store should not have the model', function () {
                expect(store.has(user)).to.be.false;
            });

            it('model store should have no changes', function () {
                expect(store.hasChanges).to.be.false;
            });
        });

        //ERRORS
        describe('Cleaning a non-loaded model should throw an error;', () => {
            beforeEach(() => {
                store = new Store(defaults.session);
                user = User.parse(seed);
            });

            it('should throw an error', done => {
                try {
                    store.clean(user);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                    done();
                }
            });
        });
    });

    describe('Store: Syncing store;', () => {
        describe('Inserted model should be synchronized on apply changes;', () => {
            beforeEach(() => {
                user = User.parse(seed);
                store.insert(user);
                changes = store.getChanges();
                store.applyChanges(changes);
            });

            it('model store should not have changes', function () {
                expect(store.hasChanges).to.be.false;
            });

            it('model should not be new', function () {
                expect(store.isNew(user)).to.be.false;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model should be mutable', function () {
                expect(store.isMutable(user)).to.be.true;
            });

        });

        describe('Modified model should be synchronized on apply changes;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], true);
                user = users[0];
                user.username = 'Test';
                changes = store.getChanges();
                store.applyChanges(changes);
            });

            it('model store should not have changes', function () {
                expect(store.hasChanges).to.be.false;
            });

            it('model should not be new', function () {
                expect(store.isNew(user)).to.be.false;
            });

            it('model should not be modified', function () {
                expect(store.isModified(user)).to.be.false;
            });

            it('model should not be destroyed', function () {
                expect(store.isDestroyed(user)).to.be.false;
            });

            it('model should be mutable', function () {
                expect(store.isMutable(user)).to.be.true;
            });

        });

        describe('Destroyed model should be synchronized on apply changes;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], true);
                user = users[0];
                store.destroy(user);
                changes = store.getChanges();
                store.applyChanges(changes);
            });

            it('model store should not have changes', function () {
                expect(store.hasChanges).to.be.false;
            });

            it('store should not have the model', function () {
                expect(store.has(user)).to.be.false;
            });
        });

        describe('Reversing a change should remove it from the list of changes;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], true);
                user = users[0];

                user.username = 'Test';
                changes = store.getChanges();
                store.applyChanges(changes);

                user.username = 'Irakliy';
                changes = store.getChanges();
                store.applyChanges(changes);
            });

            it('model store should not have changes', function () {
                expect(store.hasChanges).to.be.false;
                expect(store.getChanges()).to.be.empty;
            });
        });

        describe('Deleting a previously inserted and synchronized model should produce two changes;', () => {
            beforeEach(() => {
                user = User.parse(seed);

                // change 1 - insert a new model and sync
                store.insert(user);
                changes = store.getChanges();
                store.applyChanges(changes);

                // change 2 - destroy the model and sync
                store.destroy(user);
                changes = store.getChanges();
                store.applyChanges(changes);
            });

            it('model store should not have changes', function () {
                expect(store.hasChanges).to.be.false;
                expect(store.getChanges()).to.be.empty;
            });
        });

        describe('Deleting a previously updated and synchronized model should produce two change;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], true);
                user = users[0];

                user.username = 'Test';
                changes = store.getChanges();
                store.applyChanges(changes);

                store.destroy(user);
                changes = store.getChanges();
                store.applyChanges(changes);
            });

            it('model store should not have changes', function () {
                expect(store.hasChanges).to.be.false;
                expect(store.getChanges()).to.be.empty;
            });
        });

        describe('Updating a previously inserted and synchronized model should produce two change;', () => {
            beforeEach(() => {
                user = User.parse(seed);

                store.insert(user);
                changes = store.getChanges();
                store.applyChanges(changes);

                user.username = 'Test';
                changes = store.getChanges();
                store.applyChanges(changes);
            });

            it('model store should not have changes', function () {
                expect(store.hasChanges).to.be.false;
                expect(store.getChanges()).to.be.empty;
            });
        });

        describe('Updating a previously updated and synchronized model should produce two change;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], true);
                user = users[0];

                user.username = 'Test';
                changes = store.getChanges();
                store.applyChanges(changes);

                user.username = 'Test2';
                changes = store.getChanges();
                store.applyChanges(changes);
            });

            it('model store should not have changes', function () {
                expect(store.hasChanges).to.be.false;
                expect(store.getChanges()).to.be.empty;
            });
        });

        describe('Multiple cycles of changes and syncing should execute correctly;', () => {
            beforeEach(() => {
                seeds = [
                    { id: '1', username: 'Irakliy', createdOn: Date.now(), updatedOn: Date.now() },
                    { id: '2', username: 'Yason', createdOn: Date.now(), updatedOn: Date.now() },
                    { id: '3', username: 'George', createdOn: Date.now(), updatedOn: Date.now() }
                ];

                newSeeds = [
                    { id: '4', username: 'Katie', createdOn: Date.now(), updatedOn: Date.now() },
                    { id: '5', username: 'Mark', createdOn: Date.now(), updatedOn: Date.now() }
                ];

                users = store.load(User, seeds, true);
            });

            it('should come process without errors', done => {
                let newUser1: User;
                let newUser2: User;
                let changes1: Array<any>;
                let changes2: Array<any>;

                expect(store.hasChanges).to.be.false;
                expect(store.has(users[0])).to.be.true;
                expect(store.has(users[1])).to.be.true;
                expect(store.has(users[2])).to.be.true;

                // change #1, delete User1
                store.destroy(users[0]);
                expect(store.isDestroyed(users[0])).to.be.true;

                // change #2, add User4
                newUser1 = User.parse(newSeeds[0]);
                store.insert(newUser1);
                expect(store.isNew(newUser1)).to.be.true;

                // change #3, update User2
                users[2].username = 'Giorgi';
                expect(store.isModified(users[2])).to.be.true;

                changes1 = store.getChanges();
                expect(changes1.length).to.equal(3);

                expect(changes1[0][0]).to.deep.equal(users[0]);
                expect(changes1[0][1]).to.be.undefined;
                expect(changes1[0][2]).to.be.undefined;

                expect(changes1[1][1]).to.deep.equal(users[2]);
                expect((changes1[1][0] as User).username).to.equal('George');
                expect(changes1[1][2]).to.deep.equal(['username']);

                expect(changes1[2][0]).to.deep.equal(undefined);
                expect(changes1[2][1]).to.deep.equal(newUser1);
                expect(changes1[2][2]).to.deep.equal(undefined);

                // Sync #1
                store.applyChanges(changes1);

                expect(store.getChanges().length).to.equal(0);

                expect(store.has(users[0])).to.be.false;
                expect(store.isNew(newUser1)).to.be.false;
                expect(store.isModified(users[2])).to.be.false;

                // change #4, add user5
                newUser2 = User.parse(newSeeds[1]);
                store.insert(newUser2);
                expect(store.isNew(newUser2)).to.be.true;

                try {
                    store.insert(users[0]);
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(StoreError);
                }

                // change #5, delete user4
                store.destroy(newUser1);
                expect(store.isDestroyed(newUser1)).to.be.true;

                // revert chang #5
                store.clean(newUser1);
                expect(store.isDestroyed(newUser1)).to.be.false;

                // change #6, destroy user3
                store.destroy(users[2]);
                users[2].username = 'Test3';
                expect(store.isDestroyed(users[2])).to.be.true;
                expect(store.isModified(users[2])).to.be.false;

                // change #7, update user6
                newUser2.username = 'Test2';
                expect(store.isModified(newUser2)).to.be.false;
                expect(store.isNew(newUser2)).to.be.true;

                // change #8, update user2
                users[1].username = 'Test';
                expect(store.isModified(users[1])).to.be.true;

                changes2 = store.getChanges();
                expect(changes2.length).to.equal(3);

                expect((changes2[0][0] as User).username, 'Yason');
                expect(changes2[0][1]).to.deep.equal(users[1]);
                expect(changes2[0][2]).to.deep.equal(['username']);

                expect((changes2[1][0] as User).username, 'Giorgi');
                expect(changes2[1][1]).to.be.undefined;
                expect(changes2[1][2]).to.be.undefined;

                expect(changes2[2][0]).to.be.undefined;
                expect(changes2[2][1]).to.deep.equal(newUser2);
                expect(changes2[2][2]).to.be.undefined;

                // Sync #2
                expect(store.hasChanges).to.be.true;
                expect(store.getChanges().length).to.equal(3);

                store.applyChanges(store.getChanges());

                expect(store.hasChanges).to.be.false;
                expect(store.getChanges()).to.be.empty;

                done();
            });
        });

        //ERRORS
        describe('Get changes should throw error if immutable models were modified;', () => {
            beforeEach(() => {
                users = store.load(User, [seed], false);
                user = users[0];
                user.username = 'Test';
            });

            it('should throw an error', done => {
                try {
                    store.getChanges();
                    done('should throw an error');
                } catch (error) {
                    expect(error).to.be.instanceof(SyncError);
                    done();
                }
            });
        });
    });
});
