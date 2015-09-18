// MODULE VARIABLES
// ================================================================================================
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.isModel = isModel;
exports.getModelHandler = getModelHandler;
exports.isModelHandler = isModelHandler;
exports.isModelQuery = isModelQuery;
var symHandler = Symbol();
exports.symHandler = symHandler;
// PUBLIC FUNCTIONS
// ================================================================================================

function isModel(model) {
    return typeof model.id === 'number' && isModelHandler(model[symHandler]);
}

function getModelHandler(model) {
    var handler = model[symHandler];
    return isModelHandler(handler) ? handler : undefined;
}

function isModelHandler(handler) {
    return handler !== undefined && typeof handler.clone === 'function' && typeof handler.infuse === 'function' && typeof handler.areEqual === 'function' && typeof handler.getSyncQueries === 'function' && typeof handler.getFetchOneQuery === 'function' && typeof handler.getFetchAllQuery === 'function';
}

function isModelQuery(query) {
    return 'handler' in query && isModelHandler(query['handler']);
}
//# sourceMappingURL=../../bin/lib/Model.js.map