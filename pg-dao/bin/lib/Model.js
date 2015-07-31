// IMPORTS
// ================================================================================================
var assert = require('assert');
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
    assert(handler, 'Model handler is undefined');
    assert(isModelHandler(handler), 'Model handler is invalid');
    return handler;
}
exports.getModelHandler = getModelHandler;
function isModelHandler(handler) {
    return (handler !== undefined)
        && (typeof handler.id === 'symbol')
        && (typeof handler.getSyncQueries === 'function');
}
exports.isModelHandler = isModelHandler;
//# sourceMappingURL=Model.js.map