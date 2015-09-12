// IMPORTS
// ================================================================================================
import { symbols } from './../index';
import { Model, ModelHandler, ModelQuery } from './../lib/Model';
import { Dao } from './../lib/Dao';
import { Query } from 'pg-io';

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
    
    // STATIC
    // --------------------------------------------------------------------------------------------
    static parse(row: any): User {
        var user = new User(row);
        user[symbols.handler] = this;
        return user;
    }

    static clone(user: User): User {
        var clone = new User(user);
        clone[symbols.handler] = this;
        return clone;
    }
    
    static areEqual(user1: User, user2: User): boolean {
        if (user1 === undefined || user2 === undefined) return false;
        return (user1.id === user2.id
            && user1.username === user2.username
            && user1.createdOn.valueOf() === user2.createdOn.valueOf()
            && user1.updatedOn.valueOf() === user2.updatedOn.valueOf());
    }
    
    static getSyncQueries(original: User, current: User): Query[] {
        var queries: Query[] = [];
        if (original === undefined && current !== undefined) {
            queries.push(new qInsertUser(current));
        }
        else if (original !== undefined && current === undefined) {
            queries.push(new qDeleteUser(original));
        }
        else if (original !== undefined && current !== undefined) {
            queries.push(new qUpdateUser(current));
        }

        return queries;
    }
    
    static infuse (target: User, source: User) {
        target.username = source.username;
        target.createdOn = source.createdOn;
        target.updatedOn = source.updatedOn;
    }
}

// QUERIES
// ================================================================================================
class AbstractQuery implements Query {
    text: string;
    params: any;
    get name(): string { return (<any> this).constructor.name; }
}

class qInsertUser extends AbstractQuery {
    constructor(user: User) {
        super();
        this.text = `INSERT INTO tmp_users (id, username, created_on, updated_on)
            SELECT {{id}}, {{username}}, {{createdOn}}, {{updatedOn}};`;
        this.params = user;
    }
}

class qDeleteUser extends AbstractQuery {
    constructor(user: User) {
        super();
        this.text = `DELETE FROM tmp_users WHERE id = ${user.id};`;
    }
}

class qUpdateUser extends AbstractQuery {
    constructor(user: User) {
        super();
        this.text = `UPDATE tmp_users SET
                        username = {{username}},
                        updated_on = {{updatedOn}}
                        WHERE id = ${user.id};`;
       this.params = user;
    }
}

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