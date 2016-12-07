// IMPORTS
// ================================================================================================
import * as pg from 'pg-io';

import { Dao } from './lib/Dao'
import { symHandler } from './lib/Model';
import { symbols as modelSymbols } from './lib/AbstractModel';

// GLOBALS
// ================================================================================================
export const symbols = {
    handler     : symHandler,
    dbSchema    : modelSymbols.dbSchema,
};

// set session constructor
pg.defaults.SessionCtr = Dao;

// set extended defaults
pg.defaults.session.validateImmutability    = true;
pg.defaults.session.validateHandlerOutput   = true;
pg.defaults.session.manageUpdatedOn         = true;

// RE-EXPORTS
// ================================================================================================
export { Database, defaults, PgError, ConnectionError, TransactionError, QueryError, ParseError } from 'pg-io';
export { ModelError, ModelQueryError, StoreError, SyncError } from './lib/errors';
export { Timestamp } from './lib/types';
export { AbstractModel } from './lib/AbstractModel';
export { dbModel, dbField } from './lib/decorators';
export { PgIdGenerator } from './lib/Model';
export { AbstractActionQuery, AbstractModelQuery } from './lib/queries';