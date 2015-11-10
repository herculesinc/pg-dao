// MODULE VARIABLES
// ================================================================================================
'use strict';

var camelPattern = /([A-Z]+)/g;
// DECORATOR DEFINITIONS
// ================================================================================================
function camelToSnake(camel) {
    return camel.replace(camelPattern, match => '_' + match.toLowerCase());
}
exports.camelToSnake = camelToSnake;
//# sourceMappingURL=util.js.map
