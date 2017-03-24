// IMPORTS
// ================================================================================================
import * as assert from 'assert';
import { Database } from './../index';
import { Dao } from './../lib/Dao';
import { User, prepareDatabase, qFetchUserById, qFetchUsersByIdList } from './setup';
import { MockLogger } from './mocks/Logger';

// OPTIONS
// ================================================================================================
const dbOptions = {
    name        : 'dbTest',
    pool: {
        maxSize : 10
    },
    connection: {
        host    : 'localhost',
        port    : 5432,
        user    : 'postgres',
        password: 'RepT%8&G5l1I',
        database: 'postgres'
    }
};

const sessionOpts = {
    logQueryText    : true,
    startTransaction: false
};

// SETUP
// ================================================================================================
const logger = new MockLogger();
const database = new Database(dbOptions, logger);

// TESTS
// ================================================================================================
async function runTests() {
    const dao: Dao = (await database.connect(sessionOpts)) as any;
    await prepareDatabase(dao);

    console.log('Field selectors: ' + User.getFieldSelectors());
    console.log('Field selector string: ' + User.getFieldSelectorString());

    try {
        await dao.startTransaction();

        const user = await dao.fetchOne<User>(User, { id: '1'}, true);
        user.username = 'Test';
        console.log(JSON.stringify(user));
        user.password = 'password467';

        const row = await dao.execute({ text: 'SELECT * FROM tmp_users WHERE id = 1', mask: 'single'});
        console.log(JSON.stringify(row));

        await dao.close('commit');
    } catch (error) {
        console.error(error.stack);
        if (dao.isActive) dao.close('rollback');
    }
}

runTests();