// IMPORTS
// ================================================================================================
import * as assert from 'assert';

import { Model, isModel, ModelHandler, getModelHandler, isModelHandler, symHandler } from './Model';

// INTERFACES
// ================================================================================================
export interface SyncInfo {
    original: Model;
    current : Model;
}

interface StoreItem {
    handler : ModelHandler<any>;
    original: Model;
    current : Model;
}

// STORE CLASS DEFINITION
// ================================================================================================
export class Store {

    private cache = new Map<ModelHandler<any>, Map<number, StoreItem>>();

    // STATE CHANGE METHODS
    // --------------------------------------------------------------------------------------------
    insert(model: Model) {
        assert(isModel(model), 'Cannot insert a model: the model is invalid');
        var handler = getModelHandler(model);

        var modelMap = this.getModelMap(handler, true);
        assert(!modelMap.has(model.id), 'Cannot insert a mode: the model is already registered');
        modelMap.set(model.id, { handler: handler, original: undefined, current: model });
    }

    destroy(model: Model) {
        assert(isModel(model), 'Cannot destroy a model: the model is invalid');

        var item = this.getStoreItem(model);
        assert(item, 'Cannot destroy a moadel: the model has not been registered with Dao');
        assert(item.current, 'Cannot destroy a model: the model has already been destroyed');

        if (item.original) {
            item.current = undefined;
        }
        else {
            var modelMap = this.getModelMap(getModelHandler(model));
            modelMap.delete(model.id);
        }
    }

    register(handler: ModelHandler<any>, modelOrModels: Model | Model[]) {
        assert(isModelHandler(handler), 'Cannot register model: model handler is invalid');
        var models = <Model[]> (Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels]);
        
        var modelMap = this.getModelMap(handler, true);
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            assert(model[symHandler] === handler, 'Cannot registre model: inconsistent model handler');
            assert(!modelMap.has(model.id), 'Cannot register a model: the model has already been registered');
            var clone = handler.clone(model);
            assert(model !== clone, 'Cannot register a model: model cloning returned the same model');
            modelMap.set(model.id, { handler: handler, original: clone, current: model });
        }
    }

    // STATE CHECK METHODS
    // --------------------------------------------------------------------------------------------
    isRegistered(model: Model): boolean {
        var item = this.getStoreItem(model);
        return (item !== undefined);
    }

    isNew(model: Model): boolean {
        var item = this.getStoreItem(model, true);
        return (item.original === undefined && item.current !== undefined);
    }

    isDestroyed(model: Model): boolean {
        var item = this.getStoreItem(model, true);
        return (item.original !== undefined && item.current === undefined);
    }

    isModified(model: Model): boolean {
        var item = this.getStoreItem(model, true);
        return (item.original !== undefined && item.current !== undefined
            && item.handler.areEqual(item.original, item.current) === false);
    }

    // STORE STATE METHODS
    // --------------------------------------------------------------------------------------------
    get hasChanges(): boolean {
        var changed = false;
        this.cache.forEach(function (modelMap) {
            modelMap.forEach(function (item) {
                changed = changed || (item.handler.areEqual(item.original, item.current) === false);
            });
        });
        return changed;
    }

    getChanges(): SyncInfo[]{
        var syncInfo: SyncInfo[] = [];
        this.cache.forEach(function (modelMap) {
            modelMap.forEach(function (item) {
                if (item.handler.areEqual(item.original, item.current) === false) {
                    syncInfo.push(item);
                }
            });
        });
        return syncInfo;
    }

    applyChanges() {
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
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private getModelMap(handler: ModelHandler<any>, create = false) {
        var modelMap = this.cache.get(handler);
        if (create && modelMap === undefined) {
            modelMap = new Map<number, StoreItem>();
            this.cache.set(handler, modelMap);
        }
        return modelMap;
    }

    private getStoreItem(model: Model, errorOnAbsent = false) {
        var handler = getModelHandler(model);
        var modelMap = this.cache.get(handler);
        var item = modelMap ? modelMap.get(model.id) : undefined;
        if (errorOnAbsent) {
            assert(item, 'Model is not registered with Dao');
        }
        return item;
    }
}