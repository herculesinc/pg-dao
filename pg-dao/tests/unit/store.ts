// IMPORTS
// ================================================================================================
import * as assert from 'assert';

import { Query } from './../../lib/Query';
import { Store } from './../../lib/Store';

import { User, UserHandler } from './setup';

// MODEL STORE INITIALIZATION
// ================================================================================================
describe('Model Store Initialization', function () {
    
    var store = new Store();
    test('Empty store should have no changes', function () {
        assert(store.getChanges().length === 0);
        assert(store.hasChanges === false);
    });
});

// REGISTERING MODELS
// ================================================================================================
describe('Registering Models', function () {

    var store = new Store();
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    var handler = new UserHandler();
    var user = handler.parse(seed);

    test('Registering a model should add it to the store', function () {
        store.register(handler, user);
        assert(store.isRegistered(user));
        assert(store.isModified(user) === false);
        assert(store.isNew(user) === false);
        assert(store.isDestroyed(user) === false);
    });

    test('Registering a model should not create changes in the store', function () {
        store.register(handler, user);
        assert(store.hasChanges === false);
    });

    test('Registering the same model twice should throw an error', function () {
        assert.throws(function () {
            store.register(handler, user);
            store.register(handler, user);
        }, assert.AssertionError);
    });

    test('Registering a non-model should throw an error', function () {
        assert.throws(function () {
            store.register(handler, seed);
        }, assert.AssertionError);
    });

    test('Registering a model with a non-handler should throw an error', function () {
        assert.throws(function () {
            store.register(<any> {}, seed);
        }, assert.AssertionError);
    });

    test('Registering a model with a wrong should throw an error', function () {
        assert.throws(function () {
            var wrongHandler = new UserHandler();
            store.register(wrongHandler, seed);
        }, assert.AssertionError);
    });
});

// UPDATING MODELS
// ================================================================================================
describe('Updating Models', function () {

    var store = new Store();
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    var handler = new UserHandler();
    var user = handler.parse(seed);
    

    test('Updating model property should mark it as modified', function () {
        store.register(handler, user);
        user.username = 'Test';
        assert(store.isModified(user));
        assert(store.isNew(user) === false);
        assert(store.isDestroyed(user) === false);
    });

    test('Updating a model should produce changes on sync', function () {
        store.register(handler, user);
        user.username = 'Test';
        assert(store.hasChanges);
        var changes = store.getChanges();
        assert(changes.length === 1);

        var original = <User> changes[0].original;
        var current = <User> changes[0].current;
        assert(original.username === seed.username);
        assert(current.username === 'Test');
    });
});

// DESTROYING MODELS
// ================================================================================================
describe('Destroying models', function () {

    var store = new Store();
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    var handler = new UserHandler();
    var user = handler.parse(seed);
    
    test('Destroying a model should mark it as destroyed', function () {
        store.register(handler, user);
        store.destroy(user);
        assert(store.isRegistered(user));
        assert(store.isDestroyed(user));
        assert(store.isModified(user) === false);
        assert(store.isNew(user) === false);
    });

    test('Destroying a model should produce store changes', function () {
        store.register(handler, user);
        store.destroy(user);
        assert(store.hasChanges);

        var changes = store.getChanges();
        assert(changes.length === 1);
        assert(changes[0].original !== undefined);
        assert(changes[0].original !== user);
        assert(changes[0].current === undefined);
        assert(handler.areEqual(<any> changes[0].original, user));
    });

    test('Destroying an inserted model should remove it from the store', function () {
        store.insert(user);
        store.destroy(user);
        assert(store.isRegistered(user) === false);
    });

    test('Destroying an un-registered model should throw an error', function () {
        assert.throws(function () {
            store.destroy(user);
        }, assert.AssertionError);
    });

    test('Destroying a non-model should throw an error', function () {
        assert.throws(function () {
            store.destroy(seed);
        }, assert.AssertionError);
    });

    test('Destroying a model twice should throw an error', function () {
        assert.throws(function () {
            store.register(handler, user);
            store.destroy(user);
            store.destroy(user);
        }, assert.AssertionError);
    });

    test('Re-registering a destroyed model should throw an error', function () {
        assert.throws(function () {
            store.register(handler, user);
            store.destroy(user);
            store.register(handler, user);
        }, assert.AssertionError);
    });
});

// INSERTING MODELS
// ================================================================================================
describe('Inserting models', function () {

    var store = new Store();
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    var handler = new UserHandler();
    var user = handler.parse(seed);

    test('Inserting a model should mark it as new', function () {
        store.insert(user);
        assert(store.isNew(user));
        assert(store.isRegistered(user));
        assert(store.isDestroyed(user) === false);
        assert(store.isModified(user) === false);
    });

    test('Inserting a model should produce store changes', function () {
        store.insert(user);
        assert(store.hasChanges);

        var changes = store.getChanges();
        assert(changes.length === 1);
        assert(changes[0].original === undefined);
        assert(changes[0].current === user);
    });
    
    test('Inserting a non-model should throw an error', function () {
        assert.throws(function () {
            store.insert(seed);
        }, assert.AssertionError);
    });

    test('Inserting a registered model throw an error', function () {
        assert.throws(function () {
            store.register(handler, user);
            store.insert(user);
        }, assert.AssertionError);
    });

    test('Inserting a model twice should throw an error', function () {
        assert.throws(function () {
            store.insert(user);
            store.insert(user);
        }, assert.AssertionError);
    });

    test('Inserting a destroyed model should throw an error', function () {
        assert.throws(function () {
            store.register(handler, user);
            store.destroy(user);
            store.insert(user);
        }, assert.AssertionError);
    });

    test('Re-registering an inserted model should throw an error', function () {
        assert.throws(function () {
            store.insert(user);
            store.register(handler, user);
        }, assert.AssertionError);
    });
});

// SYNCING STORE
// ================================================================================================
describe('Model Store Syncing', function () {

    var store = new Store();
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    var handler = new UserHandler();
    var user = handler.parse(seed);

    test('Inserted model should be synchronized on apply changes', function () {
        store.insert(user);
        store.applyChanges();
        assert(store.hasChanges === false);
    });

    test('Modified model should be synchronized on apply changes', function () {
        store.register(handler, user);
        user.username = 'Test';
        store.applyChanges();
        assert(store.hasChanges === false);
    });

    test('Destroyed model should be synchronized on apply changes', function () {
        store.register(handler, user);
        store.destroy(user);
        store.applyChanges();
        assert(store.hasChanges === false);
    });
});
