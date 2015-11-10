// IMPORTS
// ================================================================================================
import { PgError } from 'pg-io';

export class ModelError extends PgError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'Model Error';
	}
};

export class ModelQueryError extends ModelError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'ModelQuery Error';
	}
};

export class StoreError extends PgError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'Store Error';
	}
};

export class SyncError extends PgError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'Sync Error';
	}
};