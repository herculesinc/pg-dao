'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _pgIo = require('pg-io');

class ModelStoreError extends _pgIo.PgError {}

exports.ModelStoreError = ModelStoreError;

;

class ModelSyncError extends _pgIo.PgError {}

exports.ModelSyncError = ModelSyncError;

;
//# sourceMappingURL=../../bin/lib/errors.js.map