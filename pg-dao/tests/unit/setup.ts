// IMPORTS
// ================================================================================================
import { symbols } from './../../index';
import { Model, ModelHandler } from './../../lib/Model';
import { Query } from './../../lib/Query';

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
        return new User(user);
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
    
    getSyncQueries(origina: User, current: User): Query[] {
        return [];
    }
}
