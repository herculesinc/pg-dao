// IMPORTS
// ================================================================================================
var assert = require('assert');
var Model_1 = require('./../../lib/Model');
var setup_1 = require('./setup');
// TESTS
// ================================================================================================
describe('Model function tests', function () {
    test('Model handler is identified correctly', function () {
        var testHandler = new setup_1.UserHandler();
        testHandler.clone = undefined;
        assert(Model_1.isModelHandler(testHandler) === false);
    });
});
describe('User model tests', function () {
    var seed = { id: 1, username: 'Irakliy', createdOn: new Date(), updatedOn: new Date() };
    var userHandler = new setup_1.UserHandler();
    test('User handler is model handler', function () {
        assert(Model_1.isModelHandler(userHandler));
    });
    test('User properties are set correctly', function () {
        var user = userHandler.parse(seed);
        assert(user.id === seed.id);
        assert(user.username === seed.username);
        assert(user.createdOn === seed.createdOn);
        assert(user.updatedOn === seed.updatedOn);
    });
    test('User is a model', function () {
        var user = userHandler.parse(seed);
        assert(Model_1.isModel(user));
    });
    test('User is a model', function () {
        var user = userHandler.parse(seed);
        assert(Model_1.isModel(user));
    });
});
//# sourceMappingURL=model.js.map