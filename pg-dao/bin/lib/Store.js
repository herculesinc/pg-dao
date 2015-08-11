// IMPORTS
// ================================================================================================
var assert = require('assert');
var Model_1 = require('./Model');
// STORE CLASS DEFINITION
// ================================================================================================
var Store = (function () {
    function Store() {
        this.cache = new Map();
    }
    // STATE CHANGE METHODS
    // --------------------------------------------------------------------------------------------
    Store.prototype.insert = function (model) {
        assert(Model_1.isModel(model), 'Cannot insert a model: the model is invalid');
        var handler = Model_1.getModelHandler(model);
        var modelMap = this.getModelMap(handler, true);
        assert(!modelMap.has(model.id), 'Cannot insert a mode: the model is already registered');
        modelMap.set(model.id, { handler: handler, original: undefined, current: model });
    };
    Store.prototype.destroy = function (model) {
        assert(Model_1.isModel(model), 'Cannot destroy a model: the model is invalid');
        var item = this.getStoreItem(model);
        assert(item, 'Cannot destroy a moadel: the model has not been registered with Dao');
        assert(item.current, 'Cannot destroy a model: the model has already been destroyed');
        if (item.original) {
            item.current = undefined;
        }
        else {
            var modelMap = this.getModelMap(Model_1.getModelHandler(model));
            modelMap.delete(model.id);
        }
    };
    Store.prototype.register = function (handler, modelOrModels) {
        assert(Model_1.isModelHandler(handler), 'Cannot register model: model handler is invalid');
        var models = (Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels]);
        var modelMap = this.getModelMap(handler, true);
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            assert(model[Model_1.symHandler] === handler, 'Cannot registre model: inconsistent model handler');
            assert(!modelMap.has(model.id), 'Cannot register a model: the model has already been registered');
            var clone = handler.clone(model);
            assert(model !== clone, 'Cannot register a model: model cloning returned the same model');
            modelMap.set(model.id, { handler: handler, original: clone, current: model });
        }
    };
    // STATE CHECK METHODS
    // --------------------------------------------------------------------------------------------
    Store.prototype.isRegistered = function (model) {
        var item = this.getStoreItem(model);
        return (item !== undefined);
    };
    Store.prototype.isNew = function (model) {
        var item = this.getStoreItem(model, true);
        return (item.original === undefined && item.current !== undefined);
    };
    Store.prototype.isDestroyed = function (model) {
        var item = this.getStoreItem(model, true);
        return (item.original !== undefined && item.current === undefined);
    };
    Store.prototype.isModified = function (model) {
        var item = this.getStoreItem(model, true);
        return (item.original !== undefined && item.current !== undefined
            && item.handler.areEqual(item.original, item.current) === false);
    };
    Object.defineProperty(Store.prototype, "hasChanges", {
        // STORE STATE METHODS
        // --------------------------------------------------------------------------------------------
        get: function () {
            var changed = false;
            this.cache.forEach(function (modelMap) {
                modelMap.forEach(function (item) {
                    changed = changed || (item.handler.areEqual(item.original, item.current) === false);
                });
            });
            return changed;
        },
        enumerable: true,
        configurable: true
    });
    Store.prototype.getChanges = function () {
        var syncInfo = [];
        this.cache.forEach(function (modelMap) {
            modelMap.forEach(function (item) {
                if (item.handler.areEqual(item.original, item.current) === false) {
                    syncInfo.push(item);
                }
            });
        });
        return syncInfo;
    };
    Store.prototype.applyChanges = function () {
        this.cache.forEach(function (modelMap) {
            modelMap.forEach(function (item) {
                if (item.handler.areEqual(item.original, item.current) === false) {
                    if (item.current) {
                        item.original = item.handler.clone(item.current);
                    }
                    else {
                        modelMap.delete(item.original.id);
                    }
                }
            });
        });
    };
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    Store.prototype.getModelMap = function (handler, create) {
        if (create === void 0) { create = false; }
        var modelMap = this.cache.get(handler);
        if (create && modelMap === undefined) {
            modelMap = new Map();
            this.cache.set(handler, modelMap);
        }
        return modelMap;
    };
    Store.prototype.getStoreItem = function (model, errorOnAbsent) {
        if (errorOnAbsent === void 0) { errorOnAbsent = false; }
        var handler = Model_1.getModelHandler(model);
        var modelMap = this.cache.get(handler);
        var item = modelMap ? modelMap.get(model.id) : undefined;
        if (errorOnAbsent) {
            assert(item, 'Model is not registered with Dao');
        }
        return item;
    };
    return Store;
})();
exports.Store = Store;
//# sourceMappingURL=Store.js.map