// IMPORTS
// ================================================================================================
import * as assert from 'assert';

import { Model, ModelState, isModel, ModelHandler, getModelHandler, isModelHandler, symHandler } from './Model';

// INTERFACES
// ================================================================================================
export interface SyncInfo {
    original: Model;
    saved : Model;
}

interface StoreItem {
    handler : ModelHandler<any>;
    original: string;
    current : string;
}

// STORE CLASS DEFINITION
// ================================================================================================
export class Store {

    private cache = new Map<symbol, Map<number, StoreItem>>();

    // STATE CHANGE METHODS
    // --------------------------------------------------------------------------------------------
    save(model: Model, setUpdatedOn: boolean): boolean {
        assert(isModel(model), 'Cannot save a model: the model is invalid');
        var handler = getModelHandler(model);

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
    }

    destroy(model: Model) {
        assert(isModel(model), 'Cannot destroy a model: the model is invalid');

        var item = this.getStoreItem(model);
        assert(item, 'Cannot destroy a moadel: the model has not been registered with Dao');
        assert(item.current, 'Cannot destroy a model: the model has already been destroyed');
        item.current = undefined;
    }

    register(handler: ModelHandler<any>, modelOrModels: Model | Model[]) {
        assert(isModelHandler(handler), 'Cannot register model: model handler is invalid');
        var models = <Model[]> (Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels]);

        var modelMap = this.getModelMap(handler, true);
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            assert(model[symHandler] === handler, 'Cannot registre model: inconsistent model handler');
            assert(!modelMap.has(model.id), 'Cannot register a model: the model has already been registered');
            var serialized = JSON.stringify(model);
            modelMap.set(model.id, { handler: handler, original: serialized, current: serialized });
        }
    }

    // STATE CHECK METHODS
    // --------------------------------------------------------------------------------------------
    isRegistered(model: Model): boolean {
        var item = this.getStoreItem(model);
        return (item !== undefined);
    }

    getModelState(model: Model): ModelState {
        var item = this.getStoreItem(model, true);
        if (item.original === undefined) {
            if (item.current) {
                return ModelState.created;
            }
            else {
                return ModelState.invalid;
            }
        }
        else if (item.current === undefined) {
            return ModelState.destroyed;
        }
        else {
            return (item.original === item.current) ? ModelState.synchronized : ModelState.modified;
        }
    }
    
    isSaved(model: Model): boolean {
        var item = this.getStoreItem(model, true);
        var serialized = JSON.stringify(model);
        return (item.current === serialized);
    }

    // STORE STATE METHODS
    // --------------------------------------------------------------------------------------------
    get hasChanges(): boolean {
        var changed = false;
        this.cache.forEach(function (modelMap) {
            modelMap.forEach(function (item) {
                changed = changed || (item.current !== item.original);
            });
        });
        return changed;
    }

    getChanges(): SyncInfo[]{
        var syncInfo: SyncInfo[] = [];
        this.cache.forEach(function (modelMap) {
            modelMap.forEach(function (item) {
                if (item.original != item.current) {
                    syncInfo.push({
                        [symHandler]: item.handler,
                        original: parse(item.original, item.handler),
                        saved: parse(item.current, item.handler)
                    });
                }
            });
        });
        return syncInfo;
    }

    applyChanges() {
        this.cache.forEach(function (modelMap) {
            modelMap.forEach(function (item) {
                if (item.original != item.current) {
                    item.original = item.current;
                }
            });
        });
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private getModelMap(handler: ModelHandler<any>, create = false) {
        var modelMap = this.cache.get(handler.id);
        if (create && modelMap === undefined) {
            modelMap = new Map<number, StoreItem>();
            this.cache.set(handler.id, modelMap);
        }
        return modelMap;
    }

    private getStoreItem(model: Model, errorOnAbsent = false) {
        var handler = getModelHandler(model);
        var modelMap = this.cache.get(handler.id);
        var item = modelMap ? modelMap.get(model.id) : undefined;
        if (errorOnAbsent) {
            assert(item, 'Model is not registered with Dao');
        }
        return item;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function parse(json: string, handler: ModelHandler<any>): Model {
    if (json === undefined) return undefined;

    var model = JSON.parse(json);
    if (typeof handler.parse === 'function') {
        model = handler.parse(model);
    }
    return model;
}