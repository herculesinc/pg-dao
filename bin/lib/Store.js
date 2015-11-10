// IMPORTS
// ================================================================================================
'use strict';

var errors_1 = require('./errors');
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
class Store {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options) {
        this.options = options;
        this.cache = new Map();
        this.changes = new Map();
    }
    // STATE CHANGE METHODS
    // --------------------------------------------------------------------------------------------
    insert(model) {
        if (Model_1.isModel(model) === false) throw new errors_1.ModelError('Cannot insert a model: the model is invalid');
        if (model[symbols.destroyed]) throw new errors_1.StoreError('Cannot insert a model: the model has been destroyed');
        var handler = model[Model_1.symHandler];
        var modelMap = this.getModelMap(handler, true);
        if (modelMap.has(model.id)) throw new errors_1.StoreError('Cannot insert a mode: the model is already in the store');
        model[symbols.mutable] = true;
        model[symbols.destroyed] = false;
        modelMap.set(model.id, model);
        return model;
    }
    destroy(model) {
        if (this.has(model) === false) throw new errors_1.StoreError('Cannot destroy a moadel: the model is not in the store');
        if (model[symbols.destroyed]) throw new errors_1.StoreError('Cannot destroy a model: the model has already been destroyed');
        if (model[symbols.mutable] === false) throw new errors_1.StoreError('Cannot destroy a model: the model is immutable');
        model[symbols.destroyed] = true;
        if (model[symbols.original] === undefined) {
            var modelMap = this.getModelMap(model[Model_1.symHandler]);
            modelMap.delete(model.id);
        }
        return model;
    }
    clean(model) {
        if (this.has(model) === false) throw new errors_1.StoreError('Cannot clean a moadel: the model is not in the store');
        if (model[symbols.mutable] === false) return model;
        var handler = model[Model_1.symHandler];
        if (model[symbols.original] === undefined) {
            var modelMap = this.getModelMap(handler);
            modelMap.delete(model.id);
        } else {
            if (model[symbols.destroyed]) {
                model[symbols.destroyed] = false;
            }
            if (handler.areEqual(model, model[symbols.original]) === false) {
                handler.infuse(model, model[symbols.original]);
            }
        }
        return model;
    }
    // STORE LOADING METHODS
    // --------------------------------------------------------------------------------------------
    load(handler, rows, mutable) {
        if (Model_1.isModelHandler(handler) === false) throw new errors_1.ModelError('Cannot load a model: model handler is invalid');
        var modelMap = this.getModelMap(handler, true);
        var models = rows.map(row => {
            var model = handler.parse(row);
            if (this.options.validateHandlerOutput && Model_1.isModel(model) === false) throw new errors_1.ModelError('Cannot load a model: the model is invalid');
            if (modelMap.has(model.id)) {
                var storeModel = modelMap.get(model.id);
                if (storeModel[symbols.mutable]) {
                    if (storeModel[symbols.destroyed]) throw new errors_1.StoreError('Cannot reload a model: the model has been destroyed');
                    if (storeModel[symbols.original] === undefined) throw new errors_1.StoreError('Cannot load a model: the model has been newly inserted');
                    if (handler.areEqual(storeModel, storeModel[symbols.original]) === false) throw new errors_1.StoreError('Cannot reload a model: the model has been modified');
                }
                handler.infuse(storeModel, model);
                storeModel[symbols.mutable] = mutable;
                storeModel[symbols.original] = model;
                return storeModel;
            } else {
                if (mutable || this.options.validateImmutability) {
                    var clone = handler.clone(model);
                    if (this.options.validateHandlerOutput && model === clone) throw new errors_1.ModelError('Cannot load a model: model cloning returned the same model');
                    model[symbols.original] = clone;
                }
                model[symbols.mutable] = mutable;
                model[symbols.destroyed] = false;
                modelMap.set(model.id, model);
                return model;
            }
        });
        return models;
    }
    // STATE CHECK METHODS
    // --------------------------------------------------------------------------------------------
    has(model) {
        let errorOnAbsent = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

        if (Model_1.isModel(model) === false) throw new errors_1.ModelError('The model is invalid');
        var modelMap = this.cache.get(model[Model_1.symHandler]);
        var storeModel = modelMap ? modelMap.get(model.id) : undefined;
        if (storeModel && model !== storeModel) throw new errors_1.StoreError('Different model with the same ID was found in the store');
        if (errorOnAbsent && storeModel === undefined) throw new errors_1.StoreError('The model was not found in the store');
        return storeModel !== undefined;
    }
    isNew(model) {
        if (this.has(model, true)) {
            return model[symbols.mutable] === true && model[symbols.original] === undefined;
        }
    }
    isDestroyed(model) {
        if (this.has(model, true)) {
            return model[symbols.destroyed] === true;
        }
    }
    isModified(model) {
        if (this.has(model, true)) {
            return model[symbols.mutable] === true && model[symbols.destroyed] === false && model[symbols.original] !== undefined && model[Model_1.symHandler].areEqual(model, model[symbols.original]) === false;
        }
    }
    isMutable(model) {
        return this.has(model, true) && model[symbols.mutable];
    }
    // STORE STATE METHODS
    // --------------------------------------------------------------------------------------------
    get hasChanges() {
        var changed = false;
        for (let cacheEntry of this.cache) {
            let handler = cacheEntry[0];
            let modelMap = cacheEntry[1];
            for (let modelEntry of modelMap) {
                let model = modelEntry[1];
                if (model[symbols.mutable]) {
                    changed = model[symbols.destroyed] || handler.areEqual(model, model[symbols.original]) === false;
                    if (changed) break;
                }
            }
            if (changed) break;
        }
        return changed;
    }
    getChanges() {
        var syncInfo = [];
        this.cache.forEach((modelMap, handler) => {
            modelMap.forEach(model => {
                if (model[symbols.mutable]) {
                    var original = model[symbols.original];
                    var current = model[symbols.destroyed] ? undefined : model;
                    if (handler.areEqual(original, current) === false) {
                        syncInfo.push({ original, current });
                    }
                } else if (this.options.validateImmutability) {
                    var original = model[symbols.original];
                    var current = model[symbols.destroyed] ? undefined : model;
                    if (handler.areEqual(original, current) === false) {
                        throw new errors_1.SyncError('Change to immutable model detected');
                    }
                }
            });
        });
        return syncInfo;
    }
    applyChanges(changes) {
        for (var i = 0; i < changes.length; i++) {
            let original = changes[i].original;
            let current = changes[i].current;
            if (current) {
                let handler = current[Model_1.symHandler];
                current[symbols.original] = handler.clone(current);
                let previousChange = this.changes.get(current);
                if (previousChange === undefined) {
                    this.changes.set(current, changes[i]);
                } else if (handler.areEqual(previousChange.original, current)) {
                    this.changes.delete(current);
                }
            } else {
                let handler = original[Model_1.symHandler];
                let modelMap = this.getModelMap(handler);
                let model = modelMap.get(original.id);
                let previousChange = this.changes.get(model);
                if (previousChange === undefined) {
                    this.changes.set(current, changes[i]);
                } else {
                    if (previousChange.original === undefined) {
                        this.changes.delete(model);
                    } else {
                        previousChange.current = undefined;
                    }
                }
                modelMap.delete(original.id);
            }
        }
        var allChanges = [];
        this.changes.forEach(change => allChanges.push(change));
        return allChanges;
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    getModelMap(handler) {
        let create = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

        var modelMap = this.cache.get(handler);
        if (create && modelMap === undefined) {
            modelMap = new Map();
            this.cache.set(handler, modelMap);
        }
        return modelMap;
    }
}
exports.Store = Store;
//# sourceMappingURL=Store.js.map
