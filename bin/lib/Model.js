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
        && (typeof handler.infuse === 'function')
        && (typeof handler.areEqual === 'function')
        && (typeof handler.getSyncQueries === 'function')
        && (typeof handler.getFetchOneQuery === 'function')
        && (typeof handler.getFetchAllQuery === 'function');
}
exports.isModelHandler = isModelHandler;
function isModelQuery(query) {
    return ('handler' in query && isModelHandler(query['handler']));
}
exports.isModelQuery = isModelQuery;
//# sourceMappingURL=Model.js.map