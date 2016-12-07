"use strict";
var Timestamp;
(function (Timestamp) {
    function parse(value) {
        if (Number.isInteger(value))
            return value;
        const ts = Number.parseInt(value, 10);
        if (!Number.isInteger(ts))
            throw new TypeError(`Cannot parse a timestamp: value ${value} is invalid`);
        return ts;
    }
    Timestamp.parse = parse;
})(Timestamp = exports.Timestamp || (exports.Timestamp = {}));
//# sourceMappingURL=types.js.map