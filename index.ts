// IMPORTS
// ================================================================================================
import * as pg from 'pg-io';

import { defaults } from './lib/defaults';
import { Dao } from './lib/Dao'
import { symHandler } from './lib/Model';
import { symbols as modelSymbols } from './lib/AbstractModel';
import * as util from './lib/util';

// GLOBALS
// ================================================================================================
export const symbols = {
    handler     : symHandler,
    dbSchema    : modelSymbols.dbSchema,
};

// set session constructor
defaults.SessionCtr = Dao;

// RE-EXPORTS
// ================================================================================================
export { defaults };
export { Database, PgError, ConnectionError, TransactionError, QueryError, ParseError } from 'pg-io';
export { ModelError, ModelQueryError, StoreError, SyncError } from './lib/errors';
export { Timestamp } from './lib/types';
export { AbstractModel } from './lib/AbstractModel';
export { dbModel, dbField } from './lib/decorators';
export { PgIdGenerator } from './lib/Model';
export { AbstractActionQuery, AbstractModelQuery } from './lib/queries';