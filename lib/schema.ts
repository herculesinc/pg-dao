// IMPORTS 
// ================================================================================================
import { ModelError } from './errors';
import { 
	Cloner, cloneObject, cloneArray, cloneDate,
	Comparator, areObjectsEqual, areArraysEqual, areDatesEqual 
} from './util';


// FIELD
// ================================================================================================
export class DbField {
	name		: string;
	type		: any;
	readonly	: boolean;
	secret?		: string;
	clone?		: Cloner<any>;
	areEqual?	: Comparator;
	
	constructor(name: string, type: any, readonly: boolean, secret: string, cloner: Cloner<any>, comparator: Comparator) {
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
				if (cloner)
					throw new ModelError('Cannot specify a cloner for Number, Boolean, or String field');
				if (comparator)
					throw new ModelError('Cannot specify a comparator for Number, Boolean, or String field');
            	break;

			case Date:
				if (cloner)
					throw new ModelError('Cannot specify a custom cloner for Date field');
				if (comparator)
					throw new ModelError('Cannot specify a custom comparator for Date field');

				this.clone = cloneDate;
				this.areEqual = areDatesEqual;
				break;

			case Object:
				if (cloner && typeof cloner !== 'function')
					throw new ModelError('Object cloner must be a function');
				if (comparator && typeof comparator !== 'function')
					throw new ModelError('Object comparator must be a function');

				this.clone = cloner || cloneObject;
				this.areEqual = comparator || areObjectsEqual;
				break;

			case Array:
				if (cloner && typeof cloner !== 'function')
					throw new ModelError('Array cloner must be a function');
				if (comparator && typeof comparator !== 'function')
					throw new ModelError('Array comparator must be a function');

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