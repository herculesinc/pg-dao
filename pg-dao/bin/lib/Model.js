// MODULE VARIABLES
// ================================================================================================
exports.symHandler = Symbol();
// PUBLIC FUNCTIONS
// ================================================================================================
function isModel(model) {
    return (typeof model.id === 'number')
        && (isModelHandler(model[exports.symHandler]));
}
exports.isModel = isModel;
function getModelHandler(model) {
    var handler = model[exports.symHandler];
    return isModelHandler(handler) ? handler : undefined;
}
exports.getModelHandler = getModelHandler;
function isModelHandler(handler) {
    return (handler !== undefined)
        && (typeof handler.clone === 'function')
        && (typeof handler.areEqual === 'function')
        && (typeof handler.getSyncQueries === 'function');
}
exports.isModelHandler = isModelHandler;
//# sourceMappingURL=Model.js.map