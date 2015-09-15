// IMPORTS
// ================================================================================================
import * as pg from 'pg-io';

import { Dao } from './lib/Dao'
import { symHandler } from './lib/Model';

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
    handler: symHandler
}

export var defaults: pg.ConnectionOptions = {
    collapseQueries         : false,
    startTransaction        : false,
    validateImmutability    : true,
    validateHandlerOutput   : true,
    manageUpdatedOn         : true,
}

pg.defaults = defaults;
pg.ConnectionConstructor = Dao;

// RE-EXPORT
// ================================================================================================
export { db } from 'pg-io';