// IMPORTS
// ================================================================================================
import { Query } from 'pg-io';
import { ModelQuery, PgIdGenerator } from './../lib/Model';
import { Dao } from './../lib/Dao';
import { AbstractModel } from './../lib/AbstractModel';
import { dbField, dbModel } from './../lib/decorators';

// SETUP
// ================================================================================================
var userIdGenerator = new PgIdGenerator('tmp_users_id_seq');

@dbModel('tmp_users', userIdGenerator)
export class User extends AbstractModel {
    
    @dbField(String)
    username: string;
    
    constructor(seed: any) {
        super(seed);
        this.username = seed.username;
    }
    
    // needed because applying decorators removes class names in TS1.7
    static get name(): string { return 'User' };
}

// QUERIES
// ================================================================================================
export class qFetchUserById implements ModelQuery<User> {
    text: string;
    handler = User;
    mask = 'object';
    mutable: boolean;

    constructor(userId: number, lock = false) {
        this.mutable = lock;
        this.text = `
            SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
            FROM tmp_users WHERE id = ${userId};`;
    }

    get name(): string { return (<any> this).constructor.name; }
}

export class qFetchUsersByIdList implements ModelQuery<User> {
    text: string;
    handler = User;
    mask = 'list';
    mutable: boolean;

    constructor(userIdList: number[], lock = false) {
        this.mutable = lock;
        this.text = `
            SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
            FROM tmp_users WHERE id in (${userIdList.join(',') })
            ORDER BY id;`;
    }

    get name(): string { return (<any> this).constructor.name; }
}

// DATABASE PRIMING
// ================================================================================================
export function prepareDatabase(dao: Dao): Promise<any> {
    return dao.execute([
        { 
            text: `DROP TABLE IF EXISTS tmp_users;` 
        },
        {
            text: `SELECT * INTO TEMPORARY tmp_users
                FROM (VALUES 
		            (1::bigint, 'Irakliy'::VARCHAR,  now()::timestamptz, now()::timestamptz),
		            (2::bigint, 'Yason'::VARCHAR, 	  now()::timestamptz, now()::timestamptz),
		            (3::bigint, 'George'::VARCHAR,   now()::timestamptz, now()::timestamptz)
	            ) AS q (id, username, created_on, updated_on);`
        },
        {
          text: 'DROP SEQUENCE IF EXISTS tmp_users_id_seq;'
        },
        {
            text: 'CREATE TEMPORARY SEQUENCE tmp_users_id_seq START 100;'
        }
    ]);
}