// IMPORTS 
// ================================================================================================
import { ModelError } from './errors';
import { deepCompare, compareArraysStrict } from './util';

// FIELD
// ================================================================================================
export class DbField {
	name		: string;
	type		: any;
	readonly	: boolean;
	secret?		: string;
	comparator?	: (value1: any, value2: any) => boolean;
	
	constructor(name: string, type: any, readonly?: boolean) {
		// validate and set name
		if (typeof name !== 'string')
            throw new ModelError('Database field property must be a string');
		this.name = name;
		
		// validate and set type
    	switch (type) {
        	case Number: case Boolean: case String: case Date:
				this.type = type;
				// check if comparator was provided
            	break;
			case Object:
				this.type = type;
				//this.comparator = something || deepCompare
				break; 
			case Array:
				this.type = type;
				//this.comparator = compareArraysStrict;
				break;
        	default:
            	throw new ModelError(`Invalid field type in model schema`);
    	}
		
		// set readonly
		this.readonly = typeof readonly == 'boolean' ? readonly : false;
	}
}