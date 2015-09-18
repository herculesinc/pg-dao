// IMPORTS
// ================================================================================================
import { PgError } from 'pg-io';

export class ModelStoreError extends PgError {};
export class ModelSyncError extends PgError {};