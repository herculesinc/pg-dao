// IMPORTS
// ================================================================================================
'use strict';

var pg_io_1 = require('pg-io');
class ModelError extends pg_io_1.PgError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'Model Error';
    }
}
exports.ModelError = ModelError;
;
class ModelQueryError extends ModelError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'ModelQuery Error';
    }
}
exports.ModelQueryError = ModelQueryError;
;
class StoreError extends pg_io_1.PgError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'Store Error';
    }
}
exports.StoreError = StoreError;
;
class SyncError extends pg_io_1.PgError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'Sync Error';
    }
}
exports.SyncError = SyncError;
;
//# sourceMappingURL=errors.js.map
