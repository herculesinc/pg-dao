// MODULE VARIABLES
// ================================================================================================

var camelPattern = /([A-Z]+)/g;

// DECORATOR DEFINITIONS
// ================================================================================================
export function camelToSnake(camel: string) {
	return camel.replace(camelPattern, (match) => '_' + match.toLowerCase());
}