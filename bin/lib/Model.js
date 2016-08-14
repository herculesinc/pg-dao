"use strict";
// MODULE VARIABLES
// ================================================================================================
exports.symHandler = Symbol();
// PUBLIC FUNCTIONS
// ================================================================================================
function isModel(model) {
    return (typeof model.id === 'string')
        && (isModelHandler(model[exports.symHandler]));
}
exports.isModel = isModel;
function isModelHandler(handler) {
    return (handler !== undefined)
        && (typeof handler.build === 'function')
        && (typeof handler.clone === 'function')
        && (typeof handler.infuse === 'function')
        && (typeof handler.areEqual === 'function')
        && (typeof handler.getSyncQueries === 'function')
        && (typeof handler.getFetchOneQuery === 'function')
        && (typeof handler.getFetchAllQuery === 'function')
        && (typeof handler.getIdGenerator === 'function');
}
exports.isModelHandler = isModelHandler;
function isModelQuery(query) {
    return isModelHandler(query['handler']);
}
exports.isModelQuery = isModelQuery;
// DEFAULT ID GENERATOR
// ================================================================================================
class PgIdGenerator {
    constructor(idSequence) {
        this.idSequenceQuery = {
            name: 'qGetNextId:' + idSequence,
            text: `SELECT nextval('${idSequence}'::regclass) AS id;`,
            mask: 'object',
            handler: {
                parse: (row) => row.id
            }
        };
    }
    getNextId(dao) {
        return dao.execute(this.idSequenceQuery);
    }
}
exports.PgIdGenerator = PgIdGenerator;
//# sourceMappingURL=Model.js.map