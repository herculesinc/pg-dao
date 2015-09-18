/*
import * as assert from 'assert';
import * as pg from './../index';
import { PoolState } from 'pg-io';
import { Dao } from './../lib/Dao'
import { User, prepareDatabase, qFetchUserById, qFetchUsersByIdList } from './setup';

interface Database {
    connect(options?: any): Promise<Dao>;
    getPoolState(): PoolState;
}

var settings = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'RepT%8&G5l1I',
    database: 'postgres'
};

var database: Database = pg.db(settings);
database.connect().then((dao) => {
    return prepareDatabase(dao).then(() => {
        return dao.fetchOne(User, {id: 1}).then((user) =>{
            console.log(user.id);
            console.log(user.username);
            console.log(dao.hasModel(user));
            console.log(dao.isNew(user));
            console.log(dao.isModified(user));
            console.log(dao.isDestroyed(user));
            console.log(dao.isMutable(user)); 
        });
    }).then(() => dao.release());
});
*/