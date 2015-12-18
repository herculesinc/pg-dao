// IMPORTS 
// ================================================================================================
import { ModelError } from './errors';

// FIELD
// ================================================================================================
export class DbField {
	name	: string;
	type	: any;
	readonly: boolean;
	
	constructor(name: string, type: any, readonly?: boolean) {
		// validate and set name
		if (typeof name !== 'string')
            throw new ModelError('Database field property must be a string');
		this.name = name;
		
		// validate and set type
    	switch (type) {
        	case Number: case Boolean: case String: case Date: case Object: case Array:
				this.type = type;
            	break;
        	default:
            	throw new ModelError(`Invalid field type in model schema`);
    	}
		
		// set readonly
		this.readonly = typeof readonly == 'boolean' ? readonly : false;
	}
}