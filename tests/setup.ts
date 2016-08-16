// IMPORTS
// ================================================================================================
import { Query, QueryMask } from 'pg-io';
import { ModelQuery, PgIdGenerator, ModelHandler } from './../lib/Model';
import { Dao } from './../lib/Dao';
import { AbstractModel } from './../lib/AbstractModel';
import { dbField, dbModel } from './../lib/decorators';

// SETUP
// ================================================================================================
const userIdGenerator = new PgIdGenerator('tmp_users_id_seq');

interface Profile {
    city: string;
}

namespace Profile {
    export function clone(profile: Profile): Profile {
        if (!profile) return undefined;
        return { city: profile.city };
    }

    export function areEqual(p1: Profile, p2: Profile): boolean {
        if (p1 == p2) return true;
        if (p1 == undefined || p2 == undefined) return false;
        return (p1.city == p2.city);
    }
}

@dbModel('tmp_users', userIdGenerator)
export class User extends AbstractModel {
    
    @dbField(String)
    username: string;
    
    @dbField(Object, { handler: Profile })
    profile: Profile;

    @dbField(Array)
    tags: string[];
    
    constructor(seed: any) {
        super(seed);
        this.username = seed.username;
        this.profile = seed.profile;
        this.tags = seed.tags;
    }
    
    // needed because applying decorators removes class names in TS1.7
    // static get name(): string { return 'User' };
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
    // static get name(): string { return 'Token' };
}

// QUERIES
// ================================================================================================
export class qFetchUserById implements ModelQuery<User> {
    text    : string;
    handler : ModelHandler<User> = User;
    mask    : 'object' = 'object';
    mutable : boolean;

    constructor(userId: number, lock = false) {
        this.mutable = lock;
        this.text = `
            SELECT id, username, tags, created_on AS "createdOn", updated_on AS "updatedOn"
            FROM tmp_users WHERE id = ${userId};`;
    }

    get name(): string { return (<any> this).constructor.name; }
}

export class qFetchUsersByIdList implements ModelQuery<User> {
    text    : string;
    handler : ModelHandler<User> = User;
    mask    : 'list' = 'list';
    mutable : boolean;

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
		            (1::bigint, 'Irakliy'::VARCHAR, '{"city": "Los Angeles"}'::jsonb, '["tag1", "tag2"]'::jsonb, now()::timestamptz, now()::timestamptz),
		            (2::bigint, 'Yason'::VARCHAR, 	'{"city": "Portland"}'::jsonb,    '["tag3", "tag4"]'::jsonb, now()::timestamptz, now()::timestamptz),
		            (3::bigint, 'George'::VARCHAR,  '{"city": "San Diego"}'::jsonb,   '["tag5", "tag6"]'::jsonb, now()::timestamptz, now()::timestamptz)
	            ) AS q (id, username, profile, tags, created_on, updated_on);`
        },
        {
          text: 'DROP SEQUENCE IF EXISTS tmp_users_id_seq;'
        },
        {
            text: 'CREATE TEMPORARY SEQUENCE tmp_users_id_seq START 100;'
        }
    ]);
}