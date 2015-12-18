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
    
    @dbField(Array)
    tags: string[];
    
    constructor(seed: any) {
        super(seed);
        this.username = seed.username;
        this.tags = seed.tags;
    }
    
    // needed because applying decorators removes class names in TS1.7
    static get name(): string { return 'User' };
}

@dbModel('tmp_tokens', userIdGenerator)
export class Token extends AbstractModel {
    
    @dbField(Number)
    status: number;
    
    constructor(seed: any) {
        super(seed);
        this.status = seed.status;
    }
    
    // needed because applying decorators removes class names in TS1.7
    static get name(): string { return 'Token' };
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
            SELECT id, username, tags, created_on AS "createdOn", updated_on AS "updatedOn"
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
            SELECT id, username, tags, created_on AS "createdOn", updated_on AS "updatedOn"
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
		            (1::bigint, 'Irakliy'::VARCHAR, '["tag1", "tag2"]'::jsonb, now()::timestamptz, now()::timestamptz),
		            (2::bigint, 'Yason'::VARCHAR, 	'["tag3", "tag4"]'::jsonb, now()::timestamptz, now()::timestamptz),
		            (3::bigint, 'George'::VARCHAR,  '["tag5", "tag6"]'::jsonb, now()::timestamptz, now()::timestamptz)
	            ) AS q (id, username, tags, created_on, updated_on);`
        },
        {
          text: 'DROP SEQUENCE IF EXISTS tmp_users_id_seq;'
        },
        {
            text: 'CREATE TEMPORARY SEQUENCE tmp_users_id_seq START 100;'
        }
    ]);
}