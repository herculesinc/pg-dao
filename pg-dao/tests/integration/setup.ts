// IMPORTS
// ================================================================================================
import { symbols } from './../../index';
import { Dao } from './../../lib/Dao';
import { Model, ModelHandler } from './../../lib/Model';
import { Query, ModelQuery } from './../../lib/Query';

var InsertQuery = Symbol();
var UpdateQuery = Symbol();
var DeleteQuery = Symbol();

// SETUP
// ================================================================================================
class AbstractModel implements Model {
    id          : number;
    createdOn   : Date;
    updatedOn   : Date;

    constructor(seed: any) {
        this.id = seed.id;
        this.createdOn = seed.createdOn;
        this.updatedOn = seed.updatedOn;
    }

    static parse(row: any): any {
        var model = new this(row);
        model[symbols.handler] = this;
        return model;
    }

    static clone(model: AbstractModel): any {
        var clone = new this(model);
        clone[symbols.handler] = this;
        return clone;
    }

    static getSyncQueries(original: any, current: any): Query[] {
        var queries: Query[] = [];
        if (original === undefined && current !== undefined) {
            let qInsertModel = this[InsertQuery];
            queries.push(new qInsertModel(current));
        }
        else if (original !== undefined && current === undefined) {
            let qDeleteModel = this[DeleteQuery];
            queries.push(new qDeleteModel(original));
        }
        else if (original !== undefined && current !== undefined) {
            let qUpdateModel = this[UpdateQuery];
            queries.push(new qUpdateModel(current));
        }

        return queries;
    }
}

interface QueryContstructor {
    new (model: any): Query;
}

function ModelDecorator(insertQuery: QueryContstructor, updateQuery: QueryContstructor, deleteQuery: QueryContstructor) {
    return function (target: any) {
        target[InsertQuery] = insertQuery;
        target[UpdateQuery] = updateQuery;
        target[DeleteQuery] = deleteQuery;

        console.log(deleteQuery);
    }
}

// QUERIES
// ================================================================================================
class AbstractQuery implements Query {
    text: string;
    get name(): string { return (<any> this).constructor.name; }
}

class qInsertUser extends AbstractQuery {
    constructor(user: User) {
        super();
        this.text = `INSERT INTO tmp_users (id, username, created_on, updated_on)
            SELECT ${user.id}, '${user.username}', '${user.createdOn.toISOString() }', '${user.updatedOn.toISOString() }';`;
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
                        username = '${user.username}',
                        updated_on = '${user.updatedOn.toISOString() }'
                        WHERE id = ${user.id};`;
    }
}

export class qFetchUserById implements ModelQuery<User> {
    text: string;
    handler = User;
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
    handler = User;
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

// USER MODEL
// ================================================================================================
@ModelDecorator(qInsertUser, qUpdateUser, qDeleteUser)
export class User extends AbstractModel {
    username: string;

    constructor(seed: any) {
        super(seed);
        this.username = seed.username;
    }

    static areEqual(user1: User, user2: User): boolean {
        if (user1 === undefined || user2 === undefined) {
            return false;
        }

        return (user1.id === user2.id
            && user1.username === user2.username
            && user1.createdOn.valueOf() === user2.createdOn.valueOf()
            && user1.updatedOn.valueOf() === user2.updatedOn.valueOf());
    }
}