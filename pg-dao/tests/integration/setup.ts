// IMPORTS
// ================================================================================================
import { symbols } from './../../index';
import { Dao } from './../../lib/Dao';
import { Model, ModelHandler } from './../../lib/Model';
import { Query, ModelQuery } from './../../lib/Query';

// SETUP
// ================================================================================================
export class User implements Model {
    id          : number;
    username    : string;
    createdOn   : Date;
    updatedOn   : Date;

    constructor(seed: any) {
        this.id = seed.id;
        this.username = seed.username;
        this.createdOn = seed.createdOn;
        this.updatedOn = seed.updatedOn;
    }
}

export class UserHandler implements ModelHandler<User> {
    
    parse(row: any): User {
        var user = new User(row);
        user[symbols.handler] = this;
        return user;
    }

    clone(user: User): User {
        var user = new User(user);
        user[symbols.handler] = this;
        return user;
    }

    areEqual(user1: User, user2: User): boolean {
        if (user1 === undefined || user2 === undefined) {
            return false;
        }

        return (user1.id === user2.id
            && user1.username === user2.username
            && user1.createdOn.valueOf() === user2.createdOn.valueOf()
            && user1.updatedOn.valueOf() === user2.updatedOn.valueOf());
    }
    
    getSyncQueries(original: User, current: User): Query[]{
        var queries: Query[] = [];
        if (original === undefined && current !== undefined) {
            queries.push({
                text: `INSERT INTO tmp_users (id, username, created_on, updated_on)
                        SELECT ${current.id}, '${current.username}', '${current.createdOn.toISOString() }', '${current.updatedOn.toISOString()}';`
            });
        }
        else if (original !== undefined && current === undefined) {
            queries.push({
                text: `DELETE FROM tmp_users WHERE id = ${original.id};`
            });
        }
        else if (original !== undefined && current !== undefined) {
            queries.push({
                text: `UPDATE tmp_users SET
                        username = '${current.username}',
                        updated_on = '${current.updatedOn.toISOString() }'
                        WHERE id = ${current.id}`
            });
        }

        return queries;
    }
}

export var userHandler = new UserHandler();

export class qFetchUserById implements ModelQuery<User> {
    text: string;
    handler = userHandler;
    mask = 'object';
    mutableModels: boolean;

    constructor(userId: number, lock = false) {
        this.mutableModels = lock;
        this.text = `
            SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
            FROM tmp_users WHERE id = ${userId};`;
    }

    get name(): string { return (<any> this).constructor.name; }
}

export class qFetchUsersByIdList implements ModelQuery<User> {
    text: string;
    handler = userHandler;
    mask = 'list';
    mutableModels: boolean;

    constructor(userIdList: number[], lock = false) {
        this.mutableModels = lock;
        this.text = `
            SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
            FROM tmp_users WHERE id in (${userIdList.join(',') })
            ORDER BY id;`;
    }

    get name(): string { return (<any> this).constructor.name; }
}

export function prepareDatabase(dao: Dao): Promise<void> {
    return dao.execute([{ text: `DROP TABLE IF EXISTS tmp_users;` },
        {
            text: `SELECT * INTO TEMPORARY tmp_users
                FROM (VALUES 
		            (1::bigint,	'Irakliy'::VARCHAR, now()::timestamptz, now()::timestamptz),
		            (2::bigint,	'Yason'::VARCHAR, 	now()::timestamptz, now()::timestamptz),
		            (3::bigint,	'George'::VARCHAR, 	now()::timestamptz, now()::timestamptz)
	            ) AS q (id, username, created_on, updated_on);`
        }
    ]);
}