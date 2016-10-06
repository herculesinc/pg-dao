// IMPORTS
// ================================================================================================
import { ModelError, StoreError, SyncError } from './errors';
import { Model, isModel, ModelHandler, isModelHandler, symHandler } from './Model';

// MODULE VARIABLES
// ================================================================================================
const symbols = {
    original    : Symbol(),
    mutable     : Symbol(),
    destroyed   : Symbol()
};

// INTERFACES
// ================================================================================================
export type SyncInfo = [Model, Model, string[]]; // [original, current, dirty fields]

export interface Options {
    validateImmutability?   : boolean;
    validateHandlerOutput?  : boolean;
}

// STORE CLASS DEFINITION
// ================================================================================================
export class Store {

    private options : Options;
    private cache   : Map<ModelHandler<any>, Map<string, Model>>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options: Options) {
        this.options = options;
        this.cache   = new Map<ModelHandler<any>, Map<string, Model>>();
    }

    // STATE CHANGE METHODS
    // --------------------------------------------------------------------------------------------
    insert(model: Model): Model {
        if (isModel(model) === false)
            throw new ModelError('Cannot insert a model: the model is invalid');
        
        if (model[symbols.destroyed])
            throw new StoreError('Cannot insert a model: the model has been destroyed');
        
        const handler = model[symHandler];
        const modelMap = this.getModelMap(handler, true);
        if (modelMap.has(model.id))
            throw new StoreError('Cannot insert a mode: the model is already in the store');
            
        model[symbols.mutable] = true;
        model[symbols.destroyed] = false;
        modelMap.set(model.id, model);
        return model;
    }

    destroy(model: Model): Model {
        if (this.has(model) === false)
            throw new StoreError('Cannot destroy a moadel: the model is not in the store');

        if (model[symbols.destroyed])
            throw new StoreError('Cannot destroy a model: the model has already been destroyed');

        if (model[symbols.mutable] === false)
            throw new StoreError('Cannot destroy a model: the model is immutable');
        
        model[symbols.destroyed] = true;

        if (model[symbols.original] === undefined) {
            const modelMap = this.getModelMap(model[symHandler]);
            modelMap.delete(model.id);
        }
        return model;
    }
    
    clean(model: Model): Model {
        if (this.has(model) === false)
            throw new StoreError('Cannot clean a moadel: the model is not in the store');
        
        if (model[symbols.mutable] === false) return model;
        
        const handler = model[symHandler];
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
    load(handler: ModelHandler<any>, rows: any[], mutable: boolean): Model[] {
        if (isModelHandler(handler) === false)
            throw new ModelError('Cannot load a model: model handler is invalid');
        
        const modelMap = this.getModelMap(handler, true);
        const models = rows.map((row) => {
            const model: Model = handler.parse(row);
            if (this.options.validateHandlerOutput && isModel(model) === false)
                throw new ModelError('Cannot load a model: the model is invalid');
            
            if (modelMap.has(model.id)) {
                const storeModel = modelMap.get(model.id);
                if (storeModel[symbols.mutable]) {
                    if (storeModel[symbols.destroyed])
                        throw new StoreError('Cannot reload a model: the model has been destroyed');
                    
                    if (storeModel[symbols.original] === undefined)
                        throw new StoreError('Cannot load a model: the model has been newly inserted');
                    
                    if (handler.areEqual(storeModel, storeModel[symbols.original]) === false)
                        throw new StoreError('Cannot reload a model: the model has been modified')
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
                        throw new ModelError('Cannot load a model: model cloning returned the same model');
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

    clear() {
        this.cache.clear();
    }

    // STATE CHECK METHODS
    // --------------------------------------------------------------------------------------------
    get<T extends Model>(handler: ModelHandler<T>, id: string): T {
        if (!isModelHandler(handler))
            throw new ModelError('The model handler is invalid');

        const modelMap = this.cache.get(handler);
        if (modelMap) {
            const model = modelMap.get(id);
            if (!model[symbols.destroyed]) {
                return model as T;
            }
        }
    }

    has(model: Model, errorOnAbsent = false): boolean {
        if (!isModel(model))
            throw new ModelError('The model is invalid');
        
        const modelMap = this.cache.get(model[symHandler]);
        const storeModel = modelMap ? modelMap.get(model.id) : undefined;
        if (storeModel && model !== storeModel)
            throw new StoreError('Different model with the same ID was found in the store');
        
        if (errorOnAbsent && storeModel === undefined)
            throw new StoreError('The model was not found in the store');
        
        return (storeModel !== undefined);
    }

    isNew(model: Model): boolean {
        if (this.has(model, true)) {
            return (model[symbols.mutable] === true
                && model[symbols.original] === undefined);   
        }
    }

    isDestroyed(model: Model): boolean {
        if (this.has(model, true)) {
            return (model[symbols.destroyed] === true);
        }
    }

    isModified(model: Model): boolean {
        if (this.has(model, true)) {
            return (model[symbols.mutable] === true 
                && model[symbols.destroyed] === false 
                && model[symbols.original] !== undefined
                && model[symHandler].areEqual(model, model[symbols.original]) === false);    
        }
    }

    isMutable(model: Model): boolean {
        return (this.has(model, true) && model[symbols.mutable]);
    }

    getModelChanges(model: Model): string[] {
        this.has(model, true);
        if (model[symbols.destroyed]) return undefined;

        const original: Model = model[symbols.original];
        if (!original) return undefined;

        const handler: ModelHandler<any> = model[symHandler];
        return handler.compare(original, model);
    }

    // STORE STATE METHODS
    // --------------------------------------------------------------------------------------------
    get hasChanges(): boolean {
        let changed = false;
        for (let [handler, modelMap] of this.cache) {
            for (let [id, model] of modelMap) {
                if(model[symbols.mutable]) {
                    changed = model[symbols.destroyed]
                        || !model[symbols.original]
                        || !handler.areEqual(model, model[symbols.original]);
                   if (changed) break;
                }
            }
            if (changed) break;
        }
        return changed;
    }

    getChanges(): SyncInfo[]{
        const syncInfo: SyncInfo[] = [];

        for (let [ handler, modelMap ] of this.cache) {
            for (let [ id, model ] of modelMap) {
                if (model[symbols.mutable]) {
                    let original: Model = model[symbols.original];
                    if (model[symbols.destroyed]) {
                        syncInfo.push([ original, undefined, undefined ]);
                    }
                    else {
                        if (!original) {
                            syncInfo.push([ undefined, model, undefined ]);
                        }
                        else {
                            const updates = handler.compare(original, model);
                            if (updates && updates.length) {
                                syncInfo.push([ original, model, updates ]);
                            }
                        }
                    }
                }
                else if (this.options.validateImmutability) {
                    const original: Model = model[symbols.original];
                    const current: Model = model[symbols.destroyed] ? undefined : model;
                    if (!handler.areEqual(original, current)) {
                        throw new SyncError('Change to immutable model detected');
                    }
                }
            }
        }

        return syncInfo;
    }

    applyChanges(changes: SyncInfo[]) {
        if (!changes || !changes.length) return;

        for (let [ original, current ] of changes) {            
            if (current) {
                let handler = current[symHandler];
                current[symbols.original] = handler.clone(current);
            }
            else {
                let handler = original[symHandler];
                let modelMap = this.getModelMap(handler);
                let model = modelMap.get(original.id);
                modelMap.delete(original.id);
            }
        }
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private getModelMap(handler: ModelHandler<any>, create = false) {
        let modelMap = this.cache.get(handler);
        if (create && modelMap === undefined) {
            modelMap = new Map<string, Model>();
            this.cache.set(handler, modelMap);
        }
        return modelMap;
    }
}