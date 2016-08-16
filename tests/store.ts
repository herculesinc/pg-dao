// IMPORTS
// ================================================================================================
import * as assert from 'assert';

import { Store } from './../lib/Store';
import { ModelError, StoreError, SyncError } from './../lib/errors';
import { defaults } from './../index'
import { User } from './setup';

// MODEL STORE INITIALIZATION
// ================================================================================================
describe('Store: Initialization', function () {
    
    var store = new Store(defaults.session);
    it('Empty store should have no changes', function () {
        assert.strictEqual(store.getChanges().length, 0);
        assert.strictEqual(store.hasChanges, false);
    });
});

// LOADING MODELS
// ================================================================================================
describe('Store: Loading Models', function () {

    var seed = { id: '1', username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    var seedAlt = { id: '1', username: 'Yason', createdOn: new Date(), updatedOn: new Date() };

    it('Loading mutable models should populate the store', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user = users[0];
        
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), true);
        assert.strictEqual(store.hasChanges, false);
    });

    it('Loading immutable models should populate the store', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], false);
        var user = users[0];
        
        assert.strictEqual(store.has(user), true, 'Store should have the model');
        assert.strictEqual(store.isModified(user), false, 'Model should not be Modified');
        assert.strictEqual(store.isNew(user), false, 'Model should not be New');
        assert.strictEqual(store.isDestroyed(user), false, 'Model should not be destroyed');
        assert.strictEqual(store.isMutable(user), false, 'Model should not be mutable');
        assert.strictEqual(store.hasChanges, false, 'Model store should have no changes');
    });

    it('Loading models with an invalid handler should throw an error', function () {
        var store = new Store(defaults.session);
        assert.throws(function () {
            store.load(<any> {}, [seed], true);
        }, ModelError);
    });
    
    it('Loading an invalid model should throw an error', function () {
        var store = new Store(defaults.session);
        if (defaults.session.validateHandlerOutput) {
            assert.throws(function () {
                store.load(User, [{}], true);
            }, ModelError);
        }
    });
    
    it('Reloading a model should update the original model data', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], false);
        var user: User = <User> users[0];
        
        store.load(User, [seedAlt], false)
        assert.strictEqual(user.username, 'Yason');
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), false);
        assert.strictEqual(store.hasChanges, false);
    });
    
    it('Reloading an immutable model can make the model mutable', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], false);
        var user: User = <User> users[0];
        
        store.load(User, [seed], true)
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

    var seed = { id: '1', username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };

    it('Updating model property should mark it as modified', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        user.username = 'Test';
        assert.strictEqual(store.isModified(user), true);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
    });

    it('Updating a model should produce store changes', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        user.username = 'Test';
        assert.strictEqual(store.hasChanges, true);
        var changes = store.getChanges();
        assert.strictEqual(changes.length, 1);

        var original = <User> changes[0][0];
        var current = <User> changes[0][1];
        assert.strictEqual(original.username, seed.username);
        assert.strictEqual(current.username, 'Test');
    });
    
    it('Reloading an updated model should throw an error', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        user.username = 'Test';
        assert.throws(function () {
            store.load(User, [seed], true);
        }, StoreError);
    });
});

// DESTROYING MODELS
// ================================================================================================
describe('Store: Destroying Models', function () {

    var seed = { id: '1', username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    
    it('Destroying a model should mark it as destroyed', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        store.destroy(user);
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isDestroyed(user), true);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isNew(user), false);
    });

    it('Destroying a model should produce store changes', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        store.destroy(user);
        assert.strictEqual(store.hasChanges, true);

        var changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.notStrictEqual(changes[0][0], undefined);
        assert.notStrictEqual(changes[0][0], user);
        assert.strictEqual(changes[0][1], undefined);
        assert.strictEqual(User.areEqual(<any> changes[0][0], user), true);
    });

    it('Destroying an immutable model should throw an error', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], false);
        var user: User = <User> users[0];
        
        assert.throws(function () {
            store.destroy(user);
        }, StoreError);
    });

    it('Destroying an non-loaded model should throw an error', function () {
        var store = new Store(defaults.session);
        var user = User.parse(seed);
        
        assert.throws(function () {
            store.destroy(user);
        }, StoreError);
    });

    it('Destroying a non-model should throw an error', function () {
        var store = new Store(defaults.session);
        assert.throws(function () {
            store.destroy(seed);
        }, ModelError);
    });

    it('Destroying a model twice should throw an error', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        assert.throws(function () {
            store.destroy(user);
            store.destroy(user);
        }, StoreError);
    });

    it('Reloading a destoryed model should throw an error', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        assert.throws(function () {
            store.destroy(user);
            store.load(User, [seed], true);
        }, StoreError);
    });
    
    it('Destroying an inserted model should remove it from the store', function () {
        var store = new Store(defaults.session);
        var user: User = User.parse(seed);
        
        store.insert(user);
        store.destroy(user);
        assert.strictEqual(store.has(user), false);
    });
});

// INSERTING MODELS
// ================================================================================================
describe('Store: Inserting Models', function () {

    var seed = { id: '1', username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };

    it('Inserting a model should mark it as new', function () {
        var store = new Store(defaults.session);
        var user = User.parse(seed);
        
        store.insert(user);
        assert.strictEqual(store.isNew(user), true);
        assert.strictEqual(store.has(user), true);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isMutable(user), true);
    });

    it('Inserting a model should produce store changes', function () {
        var store = new Store(defaults.session);
        var user = User.parse(seed);
            
        store.insert(user);
        assert.strictEqual(store.hasChanges, true);

        var changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual(changes[0][0], undefined);
        assert.strictEqual(changes[0][1], user);
    });
    
    it('Inserting a non-model should throw an error', function () {
        var store = new Store(defaults.session);
        
        assert.throws(function () {
            store.insert(seed);
        }, ModelError);
    });

    it('Inserting an already loaded model throw an error', function () {
        var store = new Store(defaults.session);
        var user = User.parse(seed);
        
        assert.throws(function () {
            store.load(User, [seed], true);
            store.insert(user);
        }, StoreError);
    });

    it('Inserting a model twice should throw an error', function () {
        var store = new Store(defaults.session);
        var user = User.parse(seed);
            
        assert.throws(function () {
            store.insert(user);
            store.insert(user);
        }, StoreError);
    });

    it('Inserting a destroyed model should throw an error', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user = users[0];
            
        assert.throws(function () {            
            store.destroy(user);
            store.insert(user);
        }, StoreError);
    });
    
    it('loading an inserted model should throw an error', function () {
        var store = new Store(defaults.session);
        var user = User.parse(seed);
                
        assert.throws(function () {
            store.insert(user);
            store.load(User, [seed], true);
        }, StoreError);
    });
    
    it('Inserting a perviously destroyed and synced model should throw an error', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        store.destroy(user);
        store.applyChanges(store.getChanges());
        assert.throws(function () {
            store.insert(user);
        }, StoreError);
    });
});

// CLEANING MODELS
// ================================================================================================
describe('Store: Cleaning Models', function () {
    
    var seed = { id: '1', username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    
    it('Cleaning an updated model should revert model changes', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        user.username = 'Test';
        assert.strictEqual(store.isModified(user), true);
        assert.strictEqual(store.hasChanges, true);
        
        store.clean(user);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(user.username, seed.username);
        assert.strictEqual(store.hasChanges, false);
    });

    it('Cleaning a deleted model should un-delete the model', function () {
        var store = new Store(defaults.session);
        var users = store.load(User, [seed], true);
        var user: User = <User> users[0];
        
        assert.strictEqual(store.hasChanges, false);
        store.destroy(user);
        assert.strictEqual(store.isDestroyed(user), true);
        assert.strictEqual(store.hasChanges, true);
        
        store.clean(user);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.hasChanges, false);
    });
    
    it('Cleaning an inserted model should remove the model from the store', function () {
        var store = new Store(defaults.session);
        var user: User = User.parse(seed);
        
        assert.strictEqual(store.hasChanges, false);
        store.insert(user);
        assert.strictEqual(store.isNew(user), true);
        assert.strictEqual(store.hasChanges, true);
        
        store.clean(user);
        assert.strictEqual(store.has(user), false);
        assert.strictEqual(store.hasChanges, false);
    });
    
    it('Cleaning a non-loaded model should throw an error', function () {
        var store = new Store(defaults.session);
        var user: User = User.parse(seed);
            
        assert.throws(function () {            
            store.clean(user);    
        }, StoreError);
    });
});


// SYNCING STORE
// ================================================================================================
describe('Store: Syncing store', function () {

    var seed = { id: '1', username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    
    it('Inserted model should be synchronized on apply changes', function () {
        const store = new Store(defaults.session);
        const user = User.parse(seed);
        store.insert(user);

        const changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual(changes[0][0], undefined);
        assert.strictEqual(changes[0][1], user);

        store.applyChanges(changes);
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), true);
    });

    it('Modified model should be synchronized on apply changes', function () {
        const store = new Store(defaults.session);
        const users = store.load(User, [seed], true);
        const user: User = <User> users[0];
        
        user.username = 'Test';
        const changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual((changes[0][0] as User).username, 'Irakliy');
        assert.strictEqual((changes[0][1] as User).username, 'Test');

        store.applyChanges(changes);
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.isNew(user), false);
        assert.strictEqual(store.isModified(user), false);
        assert.strictEqual(store.isDestroyed(user), false);
        assert.strictEqual(store.isMutable(user), true);
    });

    it('Destroyed model should be synchronized on apply changes', function () {
        const store = new Store(defaults.session);
        const users = store.load(User, [seed], true);
        const user: User = <User> users[0];
        
        store.destroy(user);

        const changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual(changes[0][0].id, user.id);
        assert.strictEqual(changes[0][1], undefined);

        store.applyChanges(changes);
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.has(user), false);
    });
    
    it('Get changes should throw error if immutable models were modified', function () {
        const store = new Store(defaults.session);
        const users = store.load(User, [seed], false);
        const user: User = <User> users[0];

        user.username = 'Test';
        if (defaults.session.validateImmutability) {
            assert.throws(function () {
                store.getChanges();
            }, SyncError);
        }
    });
    
    it('Reversing a change should remove it from the list of changes', function () {
        var store = new Store(defaults.session);
        var seeds = [
            { id: '1', username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() },
            { id: '2', username: 'Yason', createdOn: new Date(), updatedOn: new Date() },
            { id: '3', username: 'George', createdOn: new Date(), updatedOn: new Date() }
        ];
        
        var newSeeds = [
            { id: '4', username: 'Katie', createdOn: new Date(), updatedOn: new Date() },
            { id: '5', username: 'Mark', createdOn: new Date(), updatedOn: new Date() }
        ];
        
        var users = store.load(User, seeds, true) as User[];
        
        users[0].username = 'test';
        var changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        store.applyChanges(changes);
        assert.strictEqual(changes.length, 1);
        
        users[0].username = 'Irakliy';
        changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        store.applyChanges(changes);
        assert.strictEqual(store.getChanges().length, 0);
    });
    
    it('Deleting a previously inserted and syncronized model should produce two changes', function () {
        const store = new Store(defaults.session);
        const user = User.parse(seed);
        
        // change 1 - insert a new model and sync
        store.insert(user);
        let changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        store.applyChanges(changes);
        assert.strictEqual(store.getChanges().length, 0);

        // change 2 - destory the model and sync
        store.destroy(user);
        changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        store.applyChanges(changes);
        assert.strictEqual(store.getChanges().length, 0);
    });
    
    it('Deleting a previously updated and syncronized model should produce two change', function () {
        const store = new Store(defaults.session);
        const users = store.load(User, [seed], true);
        const user = users[0] as User;
        
        user.username = 'Test';
        let changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        store.applyChanges(changes);
        assert.strictEqual(store.getChanges().length, 0);
        
        store.destroy(user);
        changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual(changes[0][1], undefined);
        store.applyChanges(changes);
        changes = store.getChanges();
        assert.strictEqual(changes.length, 0);        
    });
    
    it('Updating a previously inserted and syncronized model should produce two change', function () {
        const store = new Store(defaults.session);
        const user = User.parse(seed);
        
        store.insert(user);
        let changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        store.applyChanges(changes);
        
        user.username = 'Test';
        changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual((changes[0][0] as User).username, 'Irakliy');
        assert.strictEqual((changes[0][1] as User).username, 'Test');
        store.applyChanges(changes);
    });
    
    it('Updating a previously updated and syncronized model should produce two change', function () {
        const store = new Store(defaults.session);
        const users = store.load(User, [seed], true);
        const user = users[0] as User;
        
        user.username = 'Test';
        let changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual((changes[0][0] as User).username, 'Irakliy');
        assert.strictEqual((changes[0][1] as User).username, 'Test');
        store.applyChanges(changes);
        
        user.username = 'Test2';
        changes = store.getChanges();
        assert.strictEqual(changes.length, 1);
        assert.strictEqual((changes[0][0] as User).username, 'Test');
        assert.strictEqual((changes[0][1] as User).username, 'Test2');
        store.applyChanges(changes);
    });
    
    it('Multiple cycles of changes and syncing should execute correctly', function () {
        const store = new Store(defaults.session);
        const seeds = [
            { id: '1', username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() },
            { id: '2', username: 'Yason', createdOn: new Date(), updatedOn: new Date() },
            { id: '3', username: 'George', createdOn: new Date(), updatedOn: new Date() }
        ];
        
        const newSeeds = [
            { id: '4', username: 'Katie', createdOn: new Date(), updatedOn: new Date() },
            { id: '5', username: 'Mark', createdOn: new Date(), updatedOn: new Date() }
        ];
        
        const users = <User[]> store.load(User, seeds, true);
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(store.has(users[0]), true);
        assert.strictEqual(store.has(users[1]), true);
        assert.strictEqual(store.has(users[2]), true);
        
        // change #1, delete User1
        store.destroy(users[0]);
        assert.strictEqual(store.isDestroyed(users[0]), true);
        
        // change #2, add User4
        const newUser1 = User.parse(newSeeds[0]);
        store.insert(newUser1);
        assert.strictEqual(store.isNew(newUser1), true);
        
        // change #3, update User2
        (<User>users[2]).username = 'Giorgi';
        assert.strictEqual(store.isModified(users[2]), true);
        
        let changes1 = store.getChanges();
        assert.strictEqual(changes1.length, 3);
        
        assert.strictEqual(changes1[0][1], undefined);
        assert.strictEqual(User.areEqual(<User> changes1[0][0], users[0]), true);
        
        assert.strictEqual(users[2], changes1[1][1]);
        assert.strictEqual((<User> changes1[1][0]).username, 'George');
        
        assert.strictEqual(changes1[2][1], newUser1);
        assert.strictEqual(changes1[2][0], undefined);
        
        // Sync #1
        store.applyChanges(changes1);
        let changes2 = store.getChanges();
        assert.strictEqual(changes2.length, 0);
        
        assert.strictEqual(store.has(users[0]), false);
        assert.strictEqual(store.isNew(newUser1), false);
        assert.strictEqual(store.isModified(users[2]), false);
        
        // change #4, add user5
        const newUser2 = User.parse(newSeeds[1]);
        store.insert(newUser2);
        assert.strictEqual(store.isNew(newUser2), true);
        
        assert.throws(function () {
            store.insert(users[0]);   
        }, StoreError);
        
        // change #5, delete user4
        store.destroy(newUser1);
        assert.strictEqual(store.isDestroyed(newUser1), true);
        
        // revert chang #5
        store.clean(newUser1);
        assert.strictEqual(store.isDestroyed(newUser1), false);
        
        // change #6, destroy user3
        store.destroy(users[2]);
        (<User>users[2]).username = 'Test3';
        store.isDestroyed(users[2]);
        assert.strictEqual(store.isModified(users[2]), false);
        
        // change #7, update user6
        newUser2.username = 'Test2';
        assert.strictEqual(store.isModified(newUser2), false);
        assert.strictEqual(store.isNew(newUser2), true);
        
        // change #8, update user2
        (<User> users[1]).username = 'Test';
        assert.strictEqual(store.isModified(users[1]), true);
        
        let changes3 = store.getChanges();
        assert.strictEqual(changes3.length, 3);
        
        assert.strictEqual(users[1], changes3[0][1]);
        assert.strictEqual((<User> changes3[0][0]).username, 'Yason');
        
        assert.strictEqual(changes3[1][1], undefined);
        assert.strictEqual((<User> changes3[1][0]).username, 'Giorgi');
        
        assert.strictEqual(changes3[2][1], newUser2);
        assert.strictEqual(changes3[2][0], undefined);
        
        // Sync #2
        let changes4 = store.getChanges();
        assert.strictEqual(store.hasChanges, true);
        assert.strictEqual(changes4.length, 3);

        store.applyChanges(changes4);
        let changes5 = store.getChanges();
        assert.strictEqual(store.hasChanges, false);
        assert.strictEqual(changes5.length, 0);
    });
});
