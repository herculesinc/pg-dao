// IMPORTS
// ================================================================================================
import * as assert from 'assert';
import { isModel, isModelHandler, getModelHandler } from './../../lib/Model';
import { User, UserHandler } from './setup';

// TESTS
// ================================================================================================
describe('Model function tests', function () {
    test('Model handler is identified correctly', () => {
        var testHandler: any = new UserHandler();
        testHandler.clone = undefined;
        assert(isModelHandler(testHandler) === false);
    });

});

describe('User model tests', function () {

    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };

    var userHandler = new UserHandler();
    test('User handler is model handler', () => {
        assert(isModelHandler(userHandler));
    });
    
    test('User properties are set correctly', () => {
        var user = userHandler.parse(seed);
        assert(user.id === seed.id);
        assert(user.username === seed.username);
        assert(user.createdOn === seed.createdOn);
        assert(user.updatedOn === seed.updatedOn);
    });

    test('User is a model', () => {
        var user = userHandler.parse(seed);
        assert(isModel(user));
    });

    test('User is a model', () => {
        var user = userHandler.parse(seed);
        assert(isModel(user));
    });
});