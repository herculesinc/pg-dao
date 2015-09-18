'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _pgIo = require('pg-io');

class ModelError extends _pgIo.PgError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'ModelError';
        Error.captureStackTrace(this, ModelError);
    }
}

exports.ModelError = ModelError;

;

class ModelQueryError extends ModelError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'ModelQueryError';
        Error.captureStackTrace(this, ModelQueryError);
    }
}

exports.ModelQueryError = ModelQueryError;

;

class StoreError extends _pgIo.PgError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'StoreError';
        Error.captureStackTrace(this, StoreError);
    }
}

exports.StoreError = StoreError;

;

class SyncError extends _pgIo.PgError {
    constructor(messageOrCause, cause) {
        super(messageOrCause, cause);
        this.name = 'SyncError';
        Error.captureStackTrace(this, SyncError);
    }
}

exports.SyncError = SyncError;

;
//# sourceMappingURL=../../bin/lib/errors.js.map