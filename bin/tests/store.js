// IMPORTS
// ================================================================================================
var assert = require('assert');
var Store_1 = require('./../lib/Store');
var setup_1 = require('./setup');
// MODEL STORE INITIALIZATION
// ================================================================================================
describe('Store: Initialization', function () {
    var store = new Store_1.Store();
    it('Empty store should have no changes', function () {
        assert.strictEqual(store.getChanges().length, 0);
        assert.strictEqual(store.hasChanges, false);
    });
});
// LOADING MODELS
// ================================================================================================
describe('Store: Loading Models', function () {
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    var seedAlt = { id: 1, username: 'Yason', createdOn: new Date(), updatedOn: new Date() };
    it('Loading mutable models should populate the store', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), true);
        assert.strictEqual(store.hasChanges, false);
    });
    it('Loading immutable models should populate the store', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], false);
        var user = users[0];
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), false);
        //assert.strictEqual(store.hasChanges, false);
    });
    it('Loading models with an invalid handler should throw an error', function () {
        var store = new Store_1.Store();
        assert.throws(function () {
            store.load({}, [seed], true);
        }, Error);
    });
    it('Loading an invalid model should throw an error', function () {
        var store = new Store_1.Store();
        assert.throws(function () {
            store.load(setup_1.User, [{}], true);
        }, Error);
    });
    it('Reloading a model should update the original model data', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], false);
        var user = users[0];
        store.load(setup_1.User, [seedAlt], false);
        assert.strictEqual(user.username, 'Yason');
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), false);
        assert.strictEqual(store.hasChanges, false);
    });
    it('Reloading an immutable model can make the model mutable', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], false);
        var user = users[0];
        store.load(setup_1.User, [seed], true);
        assert.strictEqual(user.username, 'Irakliy');
        assert.strictEqual(store.isMutable(user), true);
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.hasChanges, false);
    });
});
// UPDATING MODELS
// ================================================================================================
describe('Store: Updating Models', function () {
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    it('Updating model property should mark it as modified', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        user.username = 'Test';
        assert.strictEqual(store.isModified(user), true);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
    });
    it('Updating a model should produce store changes', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        user.username = 'Test';
        assert.strictEqual(store.hasChanges, true);
        var changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        var original = changes[0].original;
        var current = changes[0].current;
        assert.strictEqual(original.username, seed.username);
        assert.strictEqual(current.username, 'Test');
    });
    it('Reloading an updated model should throw an error', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        user.username = 'Test';
        assert.throws(function () {
            store.load(setup_1.User, [seed], true);
        }, Error);
    });
});
// DESTROYING MODELS
// ================================================================================================
describe('Store: Destroying Models', function () {
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    it('Destroying a model should mark it as destroyed', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        store.destroy(user);
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isDestroyed(user), true);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isNew(user), false);
    });
    it('Destroying a model should produce store changes', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        store.destroy(user);
        assert.strictEqual(store.hasChanges, true);
        var changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.notStrictEqual(changes[0].original, undefined);
        assert.notStrictEqual(changes[0].original, user);
        assert.strictEqual(changes[0].current, undefined);
        assert(setup_1.User.areEqual(changes[0].original, user));
    });
    it('Destroying an immutable model should throw an error', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], false);
        var user = users[0];
        assert.throws(function () {
            store.destroy(user);
        }, Error);
    });
    it('Destroying an non-loaded model should throw an error', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        assert.throws(function () {
            store.destroy(user);
        }, Error);
    });
    it('Destroying a non-model should throw an error', function () {
        var store = new Store_1.Store();
        assert.throws(function () {
            store.destroy(seed);
        }, Error);
    });
    it('Destroying a model twice should throw an error', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        assert.throws(function () {
            store.destroy(user);
            store.destroy(user);
        }, Error);
    });
    it('Reloading a destoryed model should throw an error', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        assert.throws(function () {
            store.destroy(user);
            store.load(setup_1.User, [seed], true);
        }, Error);
    });
    it('Destroying an inserted model should remove it from the store', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        store.insert(user);
        store.destroy(user);
        assert.strictEqual(store.has(user), false);
    });
});
// INSERTING MODELS
// ================================================================================================
describe('Store: Inserting Models', function () {
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    it('Inserting a model should mark it as new', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        store.insert(user);
        assert.strictEqual(store.isNew(user), true);
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isMutable(user), true);
    });
    it('Inserting a model should produce store changes', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        store.insert(user);
        assert.strictEqual(store.hasChanges, true);
        var changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual(changes[0].original, undefined);
        assert.strictEqual(changes[0].current, user);
    });
    it('Inserting a non-model should throw an error', function () {
        var store = new Store_1.Store();
        assert.throws(function () {
            store.insert(seed);
        }, Error);
    });
    it('Inserting an already loaded model throw an error', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        assert.throws(function () {
            store.load(setup_1.User, [seed], true);
            store.insert(user);
        }, Error);
    });
    it('Inserting a model twice should throw an error', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        assert.throws(function () {
            store.insert(user);
            store.insert(user);
        }, Error);
    });
    it('Inserting a destroyed model should throw an error', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        assert.throws(function () {
            store.destroy(user);
            store.insert(user);
        }, Error);
    });
    it('loading an inserted model should throw an error', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        assert.throws(function () {
            store.insert(user);
            store.load(setup_1.User, [seed], true);
        }, Error);
    });
});
// CLEANING MODELS
// ================================================================================================
describe('Store: Cleaning Models', function () {
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    it('Cleaning an updated model should revert model changes', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        user.username = 'Test';
        assert.strictEqual(store.isModified(user), true);
        assert.strictEqual(store.hasChanges, true);
        store.clean(user);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(user.username, seed.username);
        assert.strictEqual(store.hasChanges, false);
    });
    it('Cleaning a deleted model should un-delete the model', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        assert.strictEqual(store.hasChanges, false);
        store.destroy(user);
        assert.strictEqual(store.isDestroyed(user), true);
        assert.strictEqual(store.hasChanges, true);
        store.clean(user);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.hasChanges, false);
    });
    it('Cleaning an inserted model should remove the model from the store', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        assert.strictEqual(store.hasChanges, false);
        store.insert(user);
        assert.strictEqual(store.isNew(user), true);
        assert.strictEqual(store.hasChanges, true);
        store.clean(user);
        assert.strictEqual(store.has(user), false);
        assert.strictEqual(store.hasChanges, false);
    });
    it('Cleaning a non-loaded model should throw an error', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        assert.throws(function () {
            store.clean(user);
        }, Error);
    });
});
// SYNCING STORE
// ================================================================================================
describe('Store: Syncing store', function () {
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    it('Inserted model should be synchronized on apply changes', function () {
        var store = new Store_1.Store();
        var user = setup_1.User.parse(seed);
        store.insert(user);
        store.applyChanges();
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), true);
    });
    it('Modified model should be synchronized on apply changes', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        user.username = 'Test';
        store.applyChanges();
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), true);
    });
    it('Destroyed model should be synchronized on apply changes', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], true);
        var user = users[0];
        store.destroy(user);
        store.applyChanges();
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.has(user), false);
    });
    it('Apply changes should throw error if immutable models were modified', function () {
        var store = new Store_1.Store();
        var users = store.load(setup_1.User, [seed], false);
        var user = users[0];
        user.username = 'Test';
        assert.throws(function () {
            store.applyChanges();
        }, Error);
    });
    it('Multiple cycles of changes and syncing should execute correctly', function () {
        var store = new Store_1.Store();
        var seeds = [
            { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() },
            { id: 2, username: 'Yason', createdOn: new Date(), updatedOn: new Date() },
            { id: 3, username: 'George', createdOn: new Date(), updatedOn: new Date() }
        ];
        var newSeeds = [
            { id: 4, username: 'Katie', createdOn: new Date(), updatedOn: new Date() },
            { id: 5, username: 'Mark', createdOn: new Date(), updatedOn: new Date() }
        ];
        var users = store.load(setup_1.User, seeds, true);
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.has(users[0]), true);
        assert.strictEqual(store.has(users[1]), true);
        assert.strictEqual(store.has(users[2]), true);
        store.destroy(users[0]);
        assert.strictEqual(store.isDestroyed(users[0]), true);
        var newUser1 = setup_1.User.parse(newSeeds[0]);
        store.insert(newUser1);
        assert.strictEqual(store.isNew(newUser1), true);
        users[2].username = 'Giorgi';
        assert.strictEqual(store.isModified(users[2]), true);
        var changes = store.getChanges();
        assert.strictEqual(changes.length, 3);
        assert.strictEqual(changes[0].current, undefined);
        assert(setup_1.User.areEqual(changes[0].original, users[0]));
        assert.strictEqual(users[2], changes[1].current);
        assert(changes[1].original.username, 'Giorgi');
        assert.strictEqual(changes[2].current, newUser1);
        assert.strictEqual(changes[2].original, undefined);
        store.applyChanges();
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.getChanges().length, 0);
        assert.strictEqual(store.has(users[0]), false);
        assert.strictEqual(store.isNew(newUser1), false);
        assert.strictEqual(store.isModified(users[2]), false);
        var newUser2 = setup_1.User.parse(newSeeds[1]);
        store.insert(newUser2);
        assert.strictEqual(store.isNew(newUser2), true);
        assert.throws(function () {
            store.insert(users[0]);
        }, Error);
        store.destroy(newUser1);
        assert.strictEqual(store.isDestroyed(newUser1), true);
        store.clean(newUser1);
        assert.strictEqual(store.isDestroyed(newUser1), false);
        store.destroy(users[2]);
        users[2].username = 'Test3';
        store.isDestroyed(users[2]);
        assert.strictEqual(store.isModified(users[2]), false);
        newUser2.username = 'Test2';
        assert.strictEqual(store.isModified(newUser2), false);
        assert.strictEqual(store.isNew(newUser2), true);
        users[1].username = 'Test';
        assert.strictEqual(store.isModified(users[1]), true);
        changes = store.getChanges();
        assert.strictEqual(changes.length, 3);
        assert.strictEqual(users[1], changes[0].current);
        assert.strictEqual(changes[0].original.username, 'Yason');
        assert.strictEqual(changes[1].current, undefined);
        assert.strictEqual(changes[1].original.username, 'Giorgi');
        assert.strictEqual(changes[2].current, newUser2);
        assert.strictEqual(changes[2].original, undefined);
        store.applyChanges();
        assert.strictEqual(store.hasChanges, false);
    });
});
//# sourceMappingURL=store.js.map