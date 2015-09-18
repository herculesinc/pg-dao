'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _pgIo = require('pg-io');

class ModelStoreError extends _pgIo.PgError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'ModelStoreError';
        Error.captureStackTrace(this, ModelStoreError);
    }
}

exports.ModelStoreError = ModelStoreError;

;

class ModelSyncError extends _pgIo.PgError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'ModelSyncError';
        Error.captureStackTrace(this, ModelSyncError);
    }
}

exports.ModelSyncError = ModelSyncError;

;
//# sourceMappingURL=../../bin/lib/errors.js.map