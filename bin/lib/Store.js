"use strict";
// IMPORTS
// ================================================================================================
const errors_1 = require('./errors');
const Model_1 = require('./Model');
// MODULE VARIABLES
// ================================================================================================
const symbols = {
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
        if (Model_1.isModel(model) === false)
            throw new errors_1.ModelError('Cannot insert a model: the model is invalid');
        if (model[symbols.destroyed])
            throw new errors_1.StoreError('Cannot insert a model: the model has been destroyed');
        const handler = model[Model_1.symHandler];
        const modelMap = this.getModelMap(handler, true);
        if (modelMap.has(model.id))
            throw new errors_1.StoreError('Cannot insert a mode: the model is already in the store');
        model[symbols.mutable] = true;
        model[symbols.destroyed] = false;
        modelMap.set(model.id, model);
        return model;
    }
    destroy(model) {
        if (this.has(model) === false)
            throw new errors_1.StoreError('Cannot destroy a moadel: the model is not in the store');
        if (model[symbols.destroyed])
            throw new errors_1.StoreError('Cannot destroy a model: the model has already been destroyed');
        if (model[symbols.mutable] === false)
            throw new errors_1.StoreError('Cannot destroy a model: the model is immutable');
        model[symbols.destroyed] = true;
        if (model[symbols.original] === undefined) {
            const modelMap = this.getModelMap(model[Model_1.symHandler]);
            modelMap.delete(model.id);
        }
        return model;
    }
    clean(model) {
        if (this.has(model) === false)
            throw new errors_1.StoreError('Cannot clean a moadel: the model is not in the store');
        if (model[symbols.mutable] === false)
            return model;
        const handler = model[Model_1.symHandler];
        if (model[symbols.original] === undefined) {
            const modelMap = this.getModelMap(handler);
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
    }
    // STORE LOADING METHODS
    // --------------------------------------------------------------------------------------------
    load(handler, rows, mutable) {
        if (Model_1.isModelHandler(handler) === false)
            throw new errors_1.ModelError('Cannot load a model: model handler is invalid');
        const modelMap = this.getModelMap(handler, true);
        const models = rows.map((row) => {
            const model = handler.parse(row);
            if (this.options.validateHandlerOutput && Model_1.isModel(model) === false)
                throw new errors_1.ModelError('Cannot load a model: the model is invalid');
            if (modelMap.has(model.id)) {
                const storeModel = modelMap.get(model.id);
                if (storeModel[symbols.mutable]) {
                    if (storeModel[symbols.destroyed])
                        throw new errors_1.StoreError('Cannot reload a model: the model has been destroyed');
                    if (storeModel[symbols.original] === undefined)
                        throw new errors_1.StoreError('Cannot load a model: the model has been newly inserted');
                    if (handler.areEqual(storeModel, storeModel[symbols.original]) === false)
                        throw new errors_1.StoreError('Cannot reload a model: the model has been modified');
                }
                handler.infuse(storeModel, model);
                storeModel[symbols.mutable] = mutable;
                storeModel[symbols.original] = model;
                return storeModel;
            }
            else {
                if (mutable || this.options.validateImmutability) {
                    const clone = handler.clone(model);
                    if (this.options.validateHandlerOutput && model === clone)
                        throw new errors_1.ModelError('Cannot load a model: model cloning returned the same model');
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
    has(model, errorOnAbsent = false) {
        if (Model_1.isModel(model) === false)
            throw new errors_1.ModelError('The model is invalid');
        const modelMap = this.cache.get(model[Model_1.symHandler]);
        const storeModel = modelMap ? modelMap.get(model.id) : undefined;
        if (storeModel && model !== storeModel)
            throw new errors_1.StoreError('Different model with the same ID was found in the store');
        if (errorOnAbsent && storeModel === undefined)
            throw new errors_1.StoreError('The model was not found in the store');
        return (storeModel !== undefined);
    }
    isNew(model) {
        if (this.has(model, true)) {
            return (model[symbols.mutable] === true
                && model[symbols.original] === undefined);
        }
    }
    isDestroyed(model) {
        if (this.has(model, true)) {
            return (model[symbols.destroyed] === true);
        }
    }
    isModified(model) {
        if (this.has(model, true)) {
            return (model[symbols.mutable] === true
                && model[symbols.destroyed] === false
                && model[symbols.original] !== undefined
                && model[Model_1.symHandler].areEqual(model, model[symbols.original]) === false);
        }
    }
    isMutable(model) {
        return (this.has(model, true) && model[symbols.mutable]);
    }
    // STORE STATE METHODS
    // --------------------------------------------------------------------------------------------
    get hasChanges() {
        let changed = false;
        for (let [handler, modelMap] of this.cache) {
            for (let [id, model] of modelMap) {
                if (model[symbols.mutable]) {
                    changed = model[symbols.destroyed]
                        || !model[symbols.original]
                        || !handler.areEqual(model, model[symbols.original]);
                    if (changed)
                        break;
                }
            }
            if (changed)
                break;
        }
        return changed;
    }
    getChanges() {
        const syncInfo = [];
        for (let [handler, modelMap] of this.cache) {
            for (let [id, model] of modelMap) {
                if (model[symbols.mutable]) {
                    const original = model[symbols.original];
                    if (model[symbols.destroyed]) {
                        syncInfo.push({ original });
                    }
                    else {
                        if (!original) {
                            syncInfo.push({ current: model });
                        }
                        else {
                            const changes = handler.compare(original, model);
                            if (changes && changes.length) {
                                syncInfo.push({ original, current: model, changes });
                            }
                        }
                    }
                }
                else if (this.options.validateImmutability) {
                    const original = model[symbols.original];
                    const current = model[symbols.destroyed] ? undefined : model;
                    if (!handler.areEqual(original, current)) {
                        throw new errors_1.SyncError('Change to immutable model detected');
                    }
                }
            }
        }
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
                }
                else if (handler.areEqual(previousChange.original, current)) {
                    this.changes.delete(current);
                }
            }
            else {
                let handler = original[Model_1.symHandler];
                let modelMap = this.getModelMap(handler);
                let model = modelMap.get(original.id);
                let previousChange = this.changes.get(model);
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
        return Array.from(this.changes.values());
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    getModelMap(handler, create = false) {
        let modelMap = this.cache.get(handler);
        if (create && modelMap === undefined) {
            modelMap = new Map();
            this.cache.set(handler, modelMap);
        }
        return modelMap;
    }
}
exports.Store = Store;
//# sourceMappingURL=Store.js.map