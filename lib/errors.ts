// IMPORTS
// ================================================================================================
import { PgError } from 'pg-io';

export class ModelStoreError extends PgError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'ModelStoreError';
		(Error as any).captureStackTrace(this, ModelStoreError);
	}
};

export class ModelSyncError extends PgError {
	constructor(cause: Error);
	constructor(message: string, cause?: Error)
	constructor(messageOrCause: string | Error, cause?: Error) {
		super(messageOrCause as any, cause);
		this.name = 'ModelSyncError';
		(Error as any).captureStackTrace(this, ModelSyncError);
	}
};