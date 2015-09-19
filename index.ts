// IMPORTS
// ================================================================================================
import * as pg from 'pg-io';

import { Dao } from './lib/Dao'
import { symHandler } from './lib/Model';
import { symbols as modelSymbols } from './lib/AbstractModel';

// INTERFACES
// ================================================================================================
export interface Settings {
    host        : string;
    port?       : number;
    user        : string;
    password    : string;
    database    : string;
    poolSize?   : number;
};

export interface PoolState {
    size        : number;
    available   : number;
}

// GLOBALS
// ================================================================================================
export var symbols = {
    handler     : symHandler,
    fetchQuery  : modelSymbols.fetchQuery,
    updateQuery : modelSymbols.updateQuery,
    insertQuery : modelSymbols.insertQuery,
    deleteQuery : modelSymbols.deleteQuery,
    dbTable     : modelSymbols.dbTable,
    dbSchema    : modelSymbols.dbSchema,
    idGenerator : modelSymbols.idGenerator
}

var defaults: pg.ConnectionOptions = {
    collapseQueries         : false,
    startTransaction        : false,
    validateImmutability    : true,
    validateHandlerOutput   : true,
    manageUpdatedOn         : true,
}

pg.defaults = Object.assign(pg.defaults, defaults);
pg.constructors.connection = Dao;

// RE-EXPORTS
// ================================================================================================
export { db, defaults, PgError, ConnectionError, TransactionError, QueryError, ParseError } from 'pg-io';
export { ModelError, ModelQueryError, StoreError, SyncError } from './lib/errors';
export { AbstractModel } from './lib/AbstractModel';
export { dbModel, dbField } from './lib/decorators';
export { PgIdGenerator } from './lib/Model';