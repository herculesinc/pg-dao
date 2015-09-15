// IMPORTS
// ================================================================================================
var Model_1 = require('./Model');
// MODULE VARIABLES
// ================================================================================================
var symbols = {
    original: Symbol(),
    mutable: Symbol(),
    destroyed: Symbol()
};
// STORE CLASS DEFINITION
// ================================================================================================
var Store = (function () {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    function Store(options) {
        this.options = options;
        this.cache = new Map();
        this.changes = new Map();
    }
    // STATE CHANGE METHODS
    // --------------------------------------------------------------------------------------------
    Store.prototype.insert = function (model) {
        if (Model_1.isModel(model) === false)
            throw new Error('Cannot insert a model: the model is invalid');
        if (model[symbols.destroyed])
            throw new Error('Cannot insert a model: the model has been destroyed');
        var handler = model[Model_1.symHandler];
        var modelMap = this.getModelMap(handler, true);
        if (modelMap.has(model.id))
            throw new Error('Cannot insert a mode: the model is already in the store');
        model[symbols.mutable] = true;
        model[symbols.destroyed] = false;
        modelMap.set(model.id, model);
        return model;
    };
    Store.prototype.destroy = function (model) {
        if (this.has(model) === false)
            throw new Error('Cannot destroy a moadel: the model is not in the store');
        if (model[symbols.destroyed])
            throw new Error('Cannot destroy a model: the model has already been destroyed');
        if (model[symbols.mutable] === false)
            throw new Error('Cannot destroy a model: the model is immutable');
        model[symbols.destroyed] = true;
        if (model[symbols.original] === undefined) {
            var modelMap = this.getModelMap(model[Model_1.symHandler]);
            modelMap.delete(model.id);
        }
        return model;
    };
    Store.prototype.clean = function (model) {
        if (this.has(model) === false)
            throw new Error('Cannot clean a moadel: the model is not in the store');
        if (model[symbols.mutable] === false) {
            return model;
        }
        var handler = model[Model_1.symHandler];
        if (model[symbols.original] === undefined) {
            var modelMap = this.getModelMap(handler);
            modelMap.delete(model.id);
        }
        else {
            if (model[symbols.destroyed]) {
                model[symbols.destroyed] = false;
            }
            if (handler.areEqual(model, model[symbols.original]) === false) {
                handler.infuse(model, model[symbols.original]);
            }
        }
        return model;
    };
    // STORE LOADING METHODS
    // --------------------------------------------------------------------------------------------
    Store.prototype.load = function (handler, rows, mutable) {
        var _this = this;
        if (Model_1.isModelHandler(handler) === false)
            throw new Error('Cannot load a model: model handler is invalid');
        var modelMap = this.getModelMap(handler, true);
        var models = rows.map(function (row) {
            var model = handler.parse(row);
            if (_this.options.validateHandlerOutput && Model_1.isModel(model) === false) {
                throw new Error('Cannot load a model: the model is invalid');
            }
            if (modelMap.has(model.id)) {
                var storeModel = modelMap.get(model.id);
                if (storeModel[symbols.destroyed])
                    throw new Error('Cannot reload a model: the model has been destroyed');
                if (storeModel[symbols.original] === undefined)
                    throw new Error('Cannot load a model: the model has been newly inserted');
                if (handler.areEqual(storeModel, storeModel[symbols.original]) === false)
                    throw new Error('Cannot reload a model: the model has been modified');
                handler.infuse(storeModel, model);
                storeModel[symbols.mutable] = mutable;
                storeModel[symbols.original] = model;
                return storeModel;
            }
            else {
                if (mutable || _this.options.validateImmutability) {
                    var clone = handler.clone(model);
                    if (_this.options.validateHandlerOutput && model === clone)
                        throw new Error('Cannot load a model: model cloning returned the same model');
                    model[symbols.original] = clone;
                }
                model[symbols.mutable] = mutable;
                model[symbols.destroyed] = false;
                modelMap.set(model.id, model);
                return model;
            }
        });
        return models;
    };
    // STATE CHECK METHODS
    // --------------------------------------------------------------------------------------------
    Store.prototype.has = function (model, errorOnAbsent) {
        if (errorOnAbsent === void 0) { errorOnAbsent = false; }
        if (Model_1.isModel(model) === false)
            throw new Error('The model is invalid');
        var modelMap = this.cache.get(model[Model_1.symHandler]);
        var storeModel = modelMap ? modelMap.get(model.id) : undefined;
        if (storeModel && model !== storeModel)
            throw new Error('Different model with the same ID was found in the store');
        if (errorOnAbsent && storeModel === undefined)
            throw new Error('The model was not found in the store');
        return (storeModel !== undefined);
    };
    Store.prototype.isNew = function (model) {
        return (this.has(model, true) && model[symbols.original] === undefined);
    };
    Store.prototype.isDestroyed = function (model) {
        return (this.has(model, true) && model[symbols.destroyed] === true);
    };
    Store.prototype.isModified = function (model) {
        if (this.has(model, true)) {
            return (model[symbols.destroyed] === false && model[symbols.original] !== undefined
                && model[Model_1.symHandler].areEqual(model, model[symbols.original]) === false);
        }
    };
    Store.prototype.isMutable = function (model) {
        return (this.has(model, true) && model[symbols.mutable]);
    };
    Object.defineProperty(Store.prototype, "hasChanges", {
        // STORE STATE METHODS
        // --------------------------------------------------------------------------------------------
        get: function () {
            var changed = false;
            // TODO: replace with for...of loops
            var cacheIterator = this.cache.entries();
            var i = cacheIterator.next();
            while (i.done === false && changed === false) {
                var handler = i.value[0];
                var modelIterator = i.value[1].entries();
                var j = modelIterator.next();
                while (j.done === false && changed === false) {
                    var model = j.value[1];
                    changed = model[symbols.destroyed]
                        || (handler.areEqual(model, model[symbols.original]) === false);
                    j = modelIterator.next();
                }
                i = cacheIterator.next();
            }
            return changed;
        },
        enumerable: true,
        configurable: true
    });
    Store.prototype.getChanges = function () {
        var _this = this;
        var syncInfo = [];
        this.cache.forEach(function (modelMap, handler) {
            modelMap.forEach(function (model) {
                if (model[symbols.mutable]) {
                    var original = model[symbols.original];
                    var current = model[symbols.destroyed] ? undefined : model;
                    if (handler.areEqual(original, current) === false) {
                        syncInfo.push({ original: original, current: current });
                    }
                }
                else if (_this.options.validateImmutability) {
                    var original = model[symbols.original];
                    var current = model[symbols.destroyed] ? undefined : model;
                    if (handler.areEqual(original, current) === false) {
                        throw new Error('Change to immutable model detected');
                    }
                }
            });
        });
        return syncInfo;
    };
    Store.prototype.applyChanges = function (changes) {
        for (var i = 0; i < changes.length; i++) {
            var original = changes[i].original;
            var current = changes[i].current;
            if (current) {
                var handler = current[Model_1.symHandler];
                current[symbols.original] = handler.clone(current);
                var previousChange = this.changes.get(current);
                if (previousChange === undefined) {
                    this.changes.set(current, changes[i]);
                }
                else if (handler.areEqual(previousChange.original, current)) {
                    this.changes.delete(current);
                }
            }
            else {
                var handler = original[Model_1.symHandler];
                var modelMap = this.getModelMap(handler);
                var model = modelMap.get(original.id);
                var previousChange = this.changes.get(model);
                if (previousChange === undefined) {
                    this.changes.set(current, changes[i]);
                }
                else {
                    if (previousChange.original === undefined) {
                        this.changes.delete(model);
                    }
                    else {
                        previousChange.current = undefined;
                    }
                }
                modelMap.delete(original.id);
            }
        }
        var allChanges = [];
        this.changes.forEach(function (change) { return allChanges.push(change); });
        return allChanges;
    };
    Store.prototype.cleanChanges = function () {
        var _this = this;
        this.cache.forEach(function (modelMap, handler) {
            modelMap.forEach(function (model) {
                if (model[symbols.mutable]) {
                    _this.clean(model);
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
    return Store;
})();
exports.Store = Store;
//# sourceMappingURL=Store.js.map