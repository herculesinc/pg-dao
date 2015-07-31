    // IMPORTS
// ================================================================================================
import * as pgdao from './../index';
import { Model, ModelHandler } from './../lib/Model';
import { Query, ModelQuery, ResultType } from './../lib/Query';

// TOKEN MODEL DEFINITION
// ================================================================================================
class ModelBase implements Model {
    constructor(public id: number, public createdOn: Date, public updatedOn: Date) { }

    static test = 'testing';
}

export interface IToken extends Model {
    accountId       : number;
    status          : any;
    method          : any;
    activationToken : boolean
    expiresAt       : Date;
    lastUsed?       : Date;
    validationCode? : string;
}

export class Token extends ModelBase implements IToken {

    accountId       : number;
    status          : any;
    method          : any;
    activationToken : boolean;
    expiresAt       : Date;
    lastUsed        : Date;
    validationCode  : string;

    constructor(seed: IToken) {
        super(seed.id, seed.createdOn, seed.updatedOn);

        this.accountId              = seed.accountId;
        this.status                 = seed.status;
        this.method                 = seed.method;
        this.activationToken        = seed.activationToken ? true : false;
        this.expiresAt              = seed.expiresAt;
        this.lastUsed               = seed.lastUsed;
        this.validationCode = seed.validationCode;
        this[pgdao.symbols.handler] = tokenHandler;
    }
}

class TokenHandler implements ModelHandler<Token> {
    id = Symbol();

    parse(seed: IToken): Token { return new Token(seed); }

    getSyncQueries(original: Token, current: Token): Query[] {
        var queries = [];
        if (original === undefined && current !== undefined) {
            queries.push(new qInsertToken(current));
        }
        else if (original !== undefined && current === undefined) {
            queries.push(new qDeleteToken(original));
        }
        else if (original !== undefined && current !== undefined) {
            queries.push(new qUpdateToken(current));
        }

        return queries;
    }
}

var tokenHandler = new TokenHandler();

// TOKEN QUERIES
// ================================================================================================
class qInsertToken implements Query {

    text: string;
    get name(): string { return (<any> this).constructor.name; }

    constructor(token: Token) {
        this.text = `
        INSERT INTO tokens(
            id,
            account_id,
            status,
            method,
            activation_token,
            expires_at,
            validation_code,
            created_on,
            updated_on
        )
        SELECT
            ${token.id},
            ${token.accountId},
            ${token.status},
            ${token.method},
            ${token.activationToken},
            ${token.expiresAt},
            ${token.validationCode},
            ${token.createdOn},
            ${token.updatedOn};`;
    }
}

class qDeleteToken implements Query {
    text: string;
    get name(): string { return (<any> this).constructor.name; }

    constructor(token: Token) {
        this.text = `
            DELETE FROM tokens WHERE id = ${token.id};
        `;
    }
}

class qUpdateToken implements Query {
    text: string;
    get name(): string { return (<any> this).constructor.name; }

    constructor(token: Token) {
        this.text = `
                UPDATE tokens
                SET
                    status = ${token.status},
                    updated_on = '${token.updatedOn}'
                WHERE
                    id = ${token.id};
        `;
    }

    toString() {
        return this.name;
    }
}

export class qSelectAccountTokens implements ModelQuery<Token> {

    type = ResultType.list;
    text: string;
    mutableModels: boolean;
    handler = tokenHandler;
    get name(): string { return (<any> this).constructor.name; }

    constructor(accountId: number, lock: boolean) {
        this.mutableModels = lock;
        this.text = `
                SELECT
                    id,
                    account_id as "accountId",
                    status,
                    method,
                    activation_token as "activationToken",
                    expires_at as "expiresAt",
                    validation_code as "validationCode",
                    created_on as "createdOn",
                    updated_on as "updatedOn"
                FROM
                    tokens
                WHERE
                    account_id = ${accountId};
            `;
    }

    toString() {
        return this.name;
    }
}