// IMPORTS
// ================================================================================================
import { Model, isModel, ModelHandler, isModelHandler, symHandler } from './Model';

// MODULE VARIABLES
// ================================================================================================
var symbols = {
    original    : Symbol(),
    mutable     : Symbol(),
    destroyed   : Symbol()
}

// INTERFACES
// ================================================================================================
export interface SyncInfo {
    original: Model;
    current : Model;
}

export interface Options {
    validateImmutability?   : boolean;
    validateHandlerOutput?  : boolean;
}

// STORE CLASS DEFINITION
// ================================================================================================
export class Store {

    private options: Options;
    private cache: Map<ModelHandler<any>, Map<number, Model>>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options: Options) {
        this.cache = new Map<ModelHandler<any>, Map<number, Model>>();
        this.options = options;
    }

    // STATE CHANGE METHODS
    // --------------------------------------------------------------------------------------------
    insert(model: Model): Model {
        if (isModel(model) === false)
            throw new Error('Cannot insert a model: the model is invalid');
        
        if (model[symbols.destroyed])
            throw new Error('Cannot insert a model: the model has been destroyed');
        
        var handler = model[symHandler];
        var modelMap = this.getModelMap(handler, true);
        if (modelMap.has(model.id))
            throw new Error('Cannot insert a mode: the model is already in the store');
            
        model[symbols.mutable] = true;
        model[symbols.destroyed] = false;
        modelMap.set(model.id, model);
        return model;
    }

    destroy(model: Model): Model {
        if (this.has(model) === false)
            throw new Error('Cannot destroy a moadel: the model is not in the store');

        if (model[symbols.destroyed])
            throw new Error('Cannot destroy a model: the model has already been destroyed');

        if (model[symbols.mutable] === false)
            throw new Error('Cannot destroy a model: the model is immutable');
        
        model[symbols.destroyed] = true;

        if (model[symbols.original] === undefined) {
            var modelMap = this.getModelMap(model[symHandler]);
            modelMap.delete(model.id);
        }
        return model;
    }
    
    clean(model: Model): Model {
        if (this.has(model) === false)
            throw new Error('Cannot clean a moadel: the model is not in the store');
        
        if (model[symbols.mutable] === false) {
            return model;
        }
        
        var handler = model[symHandler];
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
    }

    // STORE LOADING METHODS
    // --------------------------------------------------------------------------------------------
    load(handler: ModelHandler<any>, rows: any[], mutable: boolean): Model[] {
        if (isModelHandler(handler) === false)
            throw new Error ('Cannot load a model: model handler is invalid');
        
        var modelMap = this.getModelMap(handler, true);
        var models = rows.map((row) => {
            var model: Model = handler.parse(row);
            if (this.options.validateHandlerOutput && isModel(model) === false) {
                throw new Error('Cannot load a model: the model is invalid');
            }
            
            if (modelMap.has(model.id)) {
                var storeModel = modelMap.get(model.id);
                if (storeModel[symbols.destroyed])
                    throw new Error('Cannot reload a model: the model has been destroyed');
                
                if (storeModel[symbols.original] === undefined)
                    throw new Error('Cannot load a model: the model has been newly inserted');
                
                if (handler.areEqual(storeModel, storeModel[symbols.original]) === false)
                    throw new Error('Cannot reload a model: the model has been modified')
                
                handler.infuse(storeModel, model);
                storeModel[symbols.mutable] = mutable;
                storeModel[symbols.original] = model;
                return storeModel;
            }
            else {
                if (mutable || this.options.validateImmutability) {
                    var clone = handler.clone(model);
                    if (this.options.validateHandlerOutput && model === clone)
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
    }

    // STATE CHECK METHODS
    // --------------------------------------------------------------------------------------------
    has(model: Model, errorOnAbsent = false): boolean {
        if (isModel(model) === false)
            throw new Error('The model is invalid');
        
        var modelMap = this.cache.get(model[symHandler]);
        var storeModel = modelMap ? modelMap.get(model.id) : undefined;
        if (storeModel && model !== storeModel)
            throw new Error('Different model with the same ID was found in the store');
        
        if (errorOnAbsent && storeModel === undefined)
            throw new Error('The model was not found in the store');
        
        return  (storeModel !== undefined);
    }

    isNew(model: Model): boolean {
        return (this.has(model, true) && model[symbols.original] === undefined);
    }

    isDestroyed(model: Model): boolean {
        return (this.has(model, true) && model[symbols.destroyed] === true);
    }

    isModified(model: Model): boolean {
        if (this.has(model, true)) {
            return (model[symbols.destroyed] === false && model[symbols.original] !== undefined
                && model[symHandler].areEqual(model, model[symbols.original]) === false);    
        }
    }

    isMutable(model: Model): boolean {
        return  (this.has(model, true) && model[symbols.mutable]);
    }

    // STORE STATE METHODS
    // --------------------------------------------------------------------------------------------
    get hasChanges(): boolean {
        var changed = false;
        
        // TODO: replace with for...of loops
        var cacheIterator = this.cache.entries();
        var i = cacheIterator.next();
        while (i.done === false && changed === false) {
             var handler = i.value[0];
             let modelIterator = i.value[1].entries();
             let j = modelIterator.next();
             while (j.done === false && changed === false) {
                 var model = j.value[1];
                 changed = model[symbols.destroyed] 
                        || (handler.areEqual(model, model[symbols.original]) === false);
                 j = modelIterator.next();
             }
             i = cacheIterator.next();
        }
        
        return changed;
    }

    getChanges(): SyncInfo[]{
        var syncInfo: SyncInfo[] = [];
        this.cache.forEach((modelMap, handler) => {
            modelMap.forEach((model) => {                
                if (model[symbols.mutable]) {
                    var original = model[symbols.original];
                    var current = model[symbols.destroyed] ? undefined : model;
                    if (handler.areEqual(original, current) === false) {
                        syncInfo.push({ original,current });
                    }
                }
                else if (this.options.validateImmutability) {
                    var original = model[symbols.original];
                    var current = model[symbols.destroyed] ? undefined : model;
                    if (handler.areEqual(original, current) === false) {
                        throw new Error('Change to immutable model detected');
                    }
                } 
            });
        });
        return syncInfo;
    }

    applyChanges(changes: SyncInfo[]) {
        for (var i = 0; i < changes.length; i++) {
            let original = changes[i].original;
            let current = changes[i].current;
            
            if (current) {
                let handler = current[symHandler];
                current[symbols.original] = handler.clone(current);
            }
            else {
                let handler = original[symHandler];
                let modelMap = this.getModelMap(handler);
                modelMap.delete(original.id);
            }
        }
    }
    
    cleanChanges() {
        this.cache.forEach((modelMap, handler) => {
            modelMap.forEach((model) => {
                if (model[symbols.mutable]) {
                    this.clean(model);
                }
            });
        });
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private getModelMap(handler: ModelHandler<any>, create = false) {
        var modelMap = this.cache.get(handler);
        if (create && modelMap === undefined) {
            modelMap = new Map<number, Model>();
            this.cache.set(handler, modelMap);
        }
        return modelMap;
    }
}