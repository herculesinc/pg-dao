// MODULE VARIABLES
// ================================================================================================
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.camelToSnake = camelToSnake;
var camelPattern = /([A-Z]+)/g;
// DECORATOR DEFINITIONS
// ================================================================================================

function camelToSnake(camel) {
    return camel.replace(camelPattern, match => '_' + match.toLowerCase());
}
//# sourceMappingURL=../../bin/lib/util.js.map