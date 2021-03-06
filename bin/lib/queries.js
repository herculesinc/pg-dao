"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ABSTRACT QUERY
// ================================================================================================
class AbstractActionQuery {
    constructor(name, params) {
        this.name = name || this.constructor.name;
        this.params = params;
    }
}
exports.AbstractActionQuery = AbstractActionQuery;
// ABSTRACT MODEL QUERY
// ================================================================================================
class AbstractModelQuery {
    constructor(handler, mask, mutable) {
        this.name = this.constructor.name;
        this.mode = 'array';
        this.handler = handler;
        this.mask = mask;
        this.mutable = typeof mutable === 'boolean' ? mutable : false;
    }
}
exports.AbstractModelQuery = AbstractModelQuery;
//# sourceMappingURL=queries.js.map