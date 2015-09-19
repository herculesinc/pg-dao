'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _pgIo = require('pg-io');

var pg = _interopRequireWildcard(_pgIo);

var _libDao = require('./lib/Dao');

var _libModel = require('./lib/Model');

var _libAbstractModel = require('./lib/AbstractModel');

;
// GLOBALS
// ================================================================================================
var symbols = {
    handler: _libModel.symHandler,
    fetchQuery: _libAbstractModel.symbols.fetchQuery,
    updateQuery: _libAbstractModel.symbols.updateQuery,
    insertQuery: _libAbstractModel.symbols.insertQuery,
    deleteQuery: _libAbstractModel.symbols.deleteQuery,
    dbTable: _libAbstractModel.symbols.dbTable,
    dbSchema: _libAbstractModel.symbols.dbSchema,
    idGenerator: _libAbstractModel.symbols.idGenerator
};
exports.symbols = symbols;
var defaults = {
    collapseQueries: false,
    startTransaction: false,
    validateImmutability: true,
    validateHandlerOutput: true,
    manageUpdatedOn: true
};
pg.defaults = Object.assign(pg.defaults, defaults);
pg.constructors.connection = _libDao.Dao;
// RE-EXPORTS
// ================================================================================================
Object.defineProperty(exports, 'db', {
    enumerable: true,
    get: function get() {
        return _pgIo.db;
    }
});
Object.defineProperty(exports, 'defaults', {
    enumerable: true,
    get: function get() {
        return _pgIo.defaults;
    }
});
Object.defineProperty(exports, 'PgError', {
    enumerable: true,
    get: function get() {
        return _pgIo.PgError;
    }
});
Object.defineProperty(exports, 'ConnectionError', {
    enumerable: true,
    get: function get() {
        return _pgIo.ConnectionError;
    }
});
Object.defineProperty(exports, 'TransactionError', {
    enumerable: true,
    get: function get() {
        return _pgIo.TransactionError;
    }
});
Object.defineProperty(exports, 'QueryError', {
    enumerable: true,
    get: function get() {
        return _pgIo.QueryError;
    }
});
Object.defineProperty(exports, 'ParseError', {
    enumerable: true,
    get: function get() {
        return _pgIo.ParseError;
    }
});

var _libErrors = require('./lib/errors');

Object.defineProperty(exports, 'ModelError', {
    enumerable: true,
    get: function get() {
        return _libErrors.ModelError;
    }
});
Object.defineProperty(exports, 'ModelQueryError', {
    enumerable: true,
    get: function get() {
        return _libErrors.ModelQueryError;
    }
});
Object.defineProperty(exports, 'StoreError', {
    enumerable: true,
    get: function get() {
        return _libErrors.StoreError;
    }
});
Object.defineProperty(exports, 'SyncError', {
    enumerable: true,
    get: function get() {
        return _libErrors.SyncError;
    }
});
Object.defineProperty(exports, 'AbstractModel', {
    enumerable: true,
    get: function get() {
        return _libAbstractModel.AbstractModel;
    }
});

var _libDecorators = require('./lib/decorators');

Object.defineProperty(exports, 'dbModel', {
    enumerable: true,
    get: function get() {
        return _libDecorators.dbModel;
    }
});
Object.defineProperty(exports, 'dbField', {
    enumerable: true,
    get: function get() {
        return _libDecorators.dbField;
    }
});
//# sourceMappingURL=../bin/index.js.map