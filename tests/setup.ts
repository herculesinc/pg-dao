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

export const initConst: any = {
    userTableName: 'tmp_users',
    userTableSecret: 'secret',
    tokensTableName: 'tmp_tokens',
    user1: {
        id: '1',
        username: 'Irakliy',
        password: 'KpEHgJcsvbg8AtQ=',
        location: {city: 'San Diego'},
        tags: ['tag5', 'tag6']
    },
    user2: {
        id: '2',
        username: 'Yason',
        password: 'KpEHgJcsvbg5BtA=',
        location: {city: 'Portland'},
        tags: ['tag3', 'tag4']
    },
    user3: {
        id: '3',
        username: 'George',
        password: 'KpEHgJcsvbg8AtQ=',
        location: {city: 'San Diego'},
        tags: ['tag5', 'tag6']
    }
};

@dbModel(initConst.userTableName, userIdGenerator)
export class User extends AbstractModel {
    
    @dbField(String)
    username: string;
    
    @dbField(String, { secret: initConst.userTableSecret })
    password: string;

    @dbField(Object, { handler: Profile })
    profile: Profile;

    @dbField(Array)
    tags: string[];

}

@dbModel(initConst.tokensTableName, userIdGenerator)
export class Token extends AbstractModel {
    
    @dbField(Number)
    status: number;
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
            SELECT id, username, password, profile, tags, created_on AS "createdOn", updated_on AS "updatedOn"
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
            SELECT id, username, password, profile, tags, created_on AS "createdOn", updated_on AS "updatedOn"
            FROM tmp_users WHERE id in (${userIdList.join(',') })
            ORDER BY id;`;
    }

    get name(): string { return (<any> this).constructor.name; }
}

// DATABASE PRIMING
// ================================================================================================
export function prepareDatabase(dao: Dao): Promise<any> {
    let users = [initConst.user1, initConst.user2, initConst.user3];

    return dao.execute([
        { 
            text: `DROP TABLE IF EXISTS tmp_users;` 
        },
        {
            text: `SELECT * INTO TEMPORARY tmp_users
                FROM (VALUES 
                    ${users.map(user => {
                        return `(
                            '${user.id}'::bigint, 
                            '${user.username}'::VARCHAR,  
                            '${user.password}'::VARCHAR, 
                            '${JSON.stringify(user.location)}'::jsonb,   
                            '${JSON.stringify(user.tags)}'::jsonb, 
                            now()::timestamptz, 
                            now()::timestamptz
                        )`;
                    })}
	            ) AS q (id, username, password, profile, tags, created_on, updated_on);`
        },
        {
          text: 'DROP SEQUENCE IF EXISTS tmp_users_id_seq;'
        },
        {
            text: 'CREATE TEMPORARY SEQUENCE tmp_users_id_seq START 100;'
        }
    ]);
}