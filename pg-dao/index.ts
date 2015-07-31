// IMPORTS
// ================================================================================================
import * as pg from 'pg';

import { Dao } from './lib/Dao';
import { symHandler } from './lib/Model';

// INTERFACES
// ================================================================================================
interface Settings {
    host        : string;
    port?       : number;
    user        : string;
    password    : string;
    database    : string;
    poolSize?   : number;
};

// GLOBALS
// ================================================================================================
pg.defaults.parseInt8 = true;

export var symbols = {
    handler: symHandler
};

// CONNECT FUNCTION
// ================================================================================================
export function connect(settings: Settings): Promise<Dao> {
    return new Promise(function (resolve, reject) {
        pg.connect(settings, function (err, client, done) {
            if (err) return reject(err);
            var dao = new Dao(settings, client, done);
            resolve(dao);
        });
    });
}