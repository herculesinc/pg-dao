// IMPORTS 
// ================================================================================================
import { ModelError } from './errors';
import { 
	Cloner, cloneObject, cloneArray, cloneDate,
	Comparator, areObjectsEqual, areArraysEqual, areDatesEqual 
} from './util';

// INTERFACES
// ================================================================================================

export interface FieldHandler {
    clone       : Cloner<any>;
    areEqual    : Comparator;
}

// FIELD
// ================================================================================================
export class DbField {
	name		: string;
	type		: any;
	readonly	: boolean;
	secret?		: string;
	clone?		: Cloner<any>;
	areEqual?	: Comparator;
	
	constructor(name: string, type: any, readonly: boolean, secret: string, handler: FieldHandler) {
		// validate and set name
		if (typeof name !== 'string') 
			throw new ModelError('Database field name must be a string');
		this.name = name;
		
		// validate and set secret
		if (secret) {
			if (typeof secret !== 'string')
				throw new ModelError('Database field secret must be a string');
			this.secret = secret;
		}
		
		// set readonly
		this.readonly = typeof readonly === 'boolean' ? readonly : false;

		// validate type and set coloner and comparator, when needed
    	switch (type) {
        	case Number: case Boolean: case String:	
				if (handler)
					throw new ModelError('Cannot specify a field handler for Number, Boolean, or String field');
            	break;

			case Date:
				if (handler)
					throw new ModelError('Cannot specify a custom field handler for Date field');

				this.clone = cloneDate;
				this.areEqual = areDatesEqual;
				break;

			case Object:
				var { cloner, comparator } = validateFieldHandler(handler);
				this.clone = cloner || cloneObject;
				this.areEqual = comparator || areObjectsEqual;
				break;

			case Array:
				var { cloner, comparator } = validateFieldHandler(handler);
				this.clone = cloner || cloneArray;
				this.areEqual = comparator || areArraysEqual;
				break;

        	default:
            	throw new ModelError(`Invalid field type in model schema`);
    	}

		// set the type
		this.type = type;
	}
}

// HELPER FUNCTIONS
// ================================================================================================
function validateFieldHandler(handler: FieldHandler): { cloner?: Cloner<any>, comparator?: Comparator} {
	if (!handler) return {};

	const cloner = handler.clone;
	if (!cloner) throw new ModelError('Undefined cloner in field handler');
	if (typeof cloner !== 'function') throw new ModelError('Invalid cloner in field handler');

	const comparator = handler.areEqual;
	if (!comparator) throw new ModelError('Undefined comparator in field handler');
	if (typeof comparator !== 'function') throw new ModelError('Invalid comparator in field handler');

	return { cloner, comparator };
}