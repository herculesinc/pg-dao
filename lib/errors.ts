// IMPORTS
// ================================================================================================
import { PgError } from 'pg-io';

export class ModelError extends PgError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'ModelError';
		(Error as any).captureStackTrace(this, ModelError);
	}
};

export class ModelQueryError extends ModelError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'ModelQueryError';
		(Error as any).captureStackTrace(this, ModelQueryError);
	}
};

export class StoreError extends PgError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'StoreError';
		(Error as any).captureStackTrace(this, StoreError);
	}
};

export class SyncError extends PgError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'SyncError';
		(Error as any).captureStackTrace(this, SyncError);
	}
};