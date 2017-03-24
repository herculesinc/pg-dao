"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const errors_1 = require("./errors");
var Timestamp;
(function (Timestamp) {
    function parse(value) {
        if (value === null || value === undefined)
            return undefined;
        if (Number.isInteger(value))
            return value;
        const ts = Number.parseInt(value, 10);
        if (!Number.isInteger(ts))
            throw new errors_1.ModelError(`Cannot parse a timestamp: value ${value} is invalid`);
        return ts;
    }
    Timestamp.parse = parse;
})(Timestamp = exports.Timestamp || (exports.Timestamp = {}));
//# sourceMappingURL=types.js.map