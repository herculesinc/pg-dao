// IMPORTS 
// ================================================================================================
import { Query } from 'pg-io';
import { Model, ModelQuery, ModelHandler } from './Model';

// ABSTRACT QUERY
// ================================================================================================
export class AbstractActionQuery implements Query{
	
	name: string;
    text: string;
	params: any;
    
	constructor(name?: string, params?: any) {
		this.name = name || this.constructor.name;
		this.params = params;
	}
}

// ABSTRACT MODEL QUERY
// ================================================================================================
export class AbstractModelQuery<T extends Model> implements ModelQuery<T>{
	
	name: string;
    mask: string;
    mutable: boolean;
    handler: ModelHandler<any>;
    text: string;
	params: any;
    
	constructor(handler: ModelHandler<T>, mask: string, mutable?: boolean) {
		this.name = this.constructor.name;
		this.handler = handler;	
		this.mask = mask;
		this.mutable = typeof mutable === 'boolean' ? mutable : false;
	}
}