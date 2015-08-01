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
    Store.prototype.save = function (model, setUpdatedOn) {
        assert(Model_1.isModel(model), 'Cannot save a model: the model is invalid');
        var handler = Model_1.getModelHandler(model);
        var modelMap = this.getModelMap(handler, true);
        var item = modelMap.get(model.id);
        if (item) {
            assert(item.current, 'Cannot save a model: the model was destroyed');
            var serialized = JSON.stringify(model);
            var updateCurrent = (serialized !== item.current);
            if (updateCurrent) {
                if (setUpdatedOn) {
                    model.updatedOn = new Date();
                    serialized = JSON.stringify(model);
                }
                item.current = serialized;
            }
            return updateCurrent;
        }
        else {
            var serialized = JSON.stringify(model);
            modelMap.set(model.id, { handler: handler, original: undefined, current: serialized });
            return true;
        }
    };
    Store.prototype.destroy = function (model) {
        assert(Model_1.isModel(model), 'Cannot destroy a model: the model is invalid');
        var item = this.getStoreItem(model);
        assert(item, 'Cannot destroy a moadel: the model has not been registered with Dao');
        assert(item.current, 'Cannot destroy a model: the model has already been destroyed');
        item.current = undefined;
    };
    Store.prototype.register = function (handler, modelOrModels) {
        assert(Model_1.isModelHandler(handler), 'Cannot register model: model handler is invalid');
        var models = (Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels]);
        var modelMap = this.getModelMap(handler, true);
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            assert(model[Model_1.symHandler] === handler, 'Cannot registre model: inconsistent model handler');
            assert(!modelMap.has(model.id), 'Cannot register a model: the model has already been registered');
            var serialized = JSON.stringify(model);
            modelMap.set(model.id, { handler: handler, original: serialized, current: serialized });
        }
    };
    // STATE CHECK METHODS
    // --------------------------------------------------------------------------------------------
    Store.prototype.isRegistered = function (model) {
        var item = this.getStoreItem(model);
        return (item !== undefined);
    };
    Store.prototype.getModelState = function (model) {
        var item = this.getStoreItem(model, true);
        if (item.original === undefined) {
            if (item.current) {
                return Model_1.ModelState.created;
            }
            else {
                return Model_1.ModelState.invalid;
            }
        }
        else if (item.current === undefined) {
            return Model_1.ModelState.destroyed;
        }
        else {
            return (item.original === item.current) ? Model_1.ModelState.synchronized : Model_1.ModelState.modified;
        }
    };
    Store.prototype.isSaved = function (model) {
        var item = this.getStoreItem(model, true);
        var serialized = JSON.stringify(model);
        return (item.current === serialized);
    };
    Object.defineProperty(Store.prototype, "hasChanges", {
        // STORE STATE METHODS
        // --------------------------------------------------------------------------------------------
        get: function () {
            var changed = false;
            this.cache.forEach(function (modelMap) {
                modelMap.forEach(function (item) {
                    changed = changed || (item.current !== item.original);
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
                if (item.original != item.current) {
                    syncInfo.push((_a = {},
                        _a[Model_1.symHandler] = item.handler,
                        _a.original = parse(item.original, item.handler),
                        _a.saved = parse(item.current, item.handler),
                        _a
                    ));
                }
                var _a;
            });
        });
        return syncInfo;
    };
    Store.prototype.applyChanges = function () {
        this.cache.forEach(function (modelMap) {
            modelMap.forEach(function (item) {
                if (item.original != item.current) {
                    item.original = item.current;
                }
            });
        });
    };
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    Store.prototype.getModelMap = function (handler, create) {
        if (create === void 0) { create = false; }
        var modelMap = this.cache.get(handler.id);
        if (create && modelMap === undefined) {
            modelMap = new Map();
            this.cache.set(handler.id, modelMap);
        }
        return modelMap;
    };
    Store.prototype.getStoreItem = function (model, errorOnAbsent) {
        if (errorOnAbsent === void 0) { errorOnAbsent = false; }
        var handler = Model_1.getModelHandler(model);
        var modelMap = this.cache.get(handler.id);
        var item = modelMap ? modelMap.get(model.id) : undefined;
        if (errorOnAbsent) {
            assert(item, 'Model is not registered with Dao');
        }
        return item;
    };
    return Store;
})();
exports.Store = Store;
// HELPER FUNCTIONS
// ================================================================================================
function parse(json, handler) {
    if (json === undefined)
        return undefined;
    var model = JSON.parse(json);
    if (typeof handler.parse === 'function') {
        model = handler.parse(model);
    }
    return model;
}
//# sourceMappingURL=Store.js.map