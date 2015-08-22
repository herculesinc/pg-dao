// IMPORTS
// ================================================================================================
import * as pg from 'pg';

import { Dao } from './lib/Dao';
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
    size: number;
    available: number;
}

// GLOBALS
// ================================================================================================
pg.defaults.parseInt8 = true;

export var symbols = {
    handler: symHandler
};

var databases = new Map<string, Database>();

export function db(settings: Settings): Database {
    var db = databases.get(JSON.stringify(settings));
    if (db === undefined) {
        db = new Database(settings);
        databases.set(JSON.stringify(settings), db);
    }
    return db;
}

// DATABASE CLASS
// ================================================================================================
class Database {

    settings: Settings;
    
    constructor(settings: Settings) {
        this.settings = settings;
    }

    connect(options?: any): Promise<Dao> {
        // TODO: merge options
        return new Promise((resolve, reject) => {
            pg.connect(this.settings, (err, client, done) => {
                if (err) return reject(err);
                var dao = new Dao(this.settings, client, done);
                resolve(dao);
            });
        });
    }

    getPoolState() {
        var pool = pg.pools.getOrCreate(this.settings);
        return {
            size: pool.getPoolSize(),
            available: pool.availableObjectsCount()
        };
    }
}