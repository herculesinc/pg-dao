var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// IMPORTS
// ================================================================================================
var pgdao = require('./../index');
var Query_1 = require('./../lib/Query');
// TOKEN MODEL DEFINITION
// ================================================================================================
var ModelBase = (function () {
    function ModelBase(id, createdOn, updatedOn) {
        this.id = id;
        this.createdOn = createdOn;
        this.updatedOn = updatedOn;
    }
    ModelBase.test = 'testing';
    return ModelBase;
})();
var Token = (function (_super) {
    __extends(Token, _super);
    function Token(seed) {
        _super.call(this, seed.id, seed.createdOn, seed.updatedOn);
        this.accountId = seed.accountId;
        this.status = seed.status;
        this.method = seed.method;
        this.activationToken = seed.activationToken ? true : false;
        this.expiresAt = seed.expiresAt;
        this.lastUsed = seed.lastUsed;
        this.validationCode = seed.validationCode;
        this[pgdao.symbols.handler] = tokenHandler;
    }
    return Token;
})(ModelBase);
exports.Token = Token;
var TokenHandler = (function () {
    function TokenHandler() {
        this.id = Symbol();
    }
    TokenHandler.prototype.parse = function (seed) { return new Token(seed); };
    TokenHandler.prototype.getSyncQueries = function (original, current) {
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
    };
    return TokenHandler;
})();
var tokenHandler = new TokenHandler();
// TOKEN QUERIES
// ================================================================================================
var qInsertToken = (function () {
    function qInsertToken(token) {
        this.text = "\n        INSERT INTO tokens(\n            id,\n            account_id,\n            status,\n            method,\n            activation_token,\n            expires_at,\n            validation_code,\n            created_on,\n            updated_on\n        )\n        SELECT\n            " + token.id + ",\n            " + token.accountId + ",\n            " + token.status + ",\n            " + token.method + ",\n            " + token.activationToken + ",\n            " + token.expiresAt + ",\n            " + token.validationCode + ",\n            " + token.createdOn + ",\n            " + token.updatedOn + ";";
    }
    Object.defineProperty(qInsertToken.prototype, "name", {
        get: function () { return this.constructor.name; },
        enumerable: true,
        configurable: true
    });
    return qInsertToken;
})();
var qDeleteToken = (function () {
    function qDeleteToken(token) {
        this.text = "\n            DELETE FROM tokens WHERE id = " + token.id + ";\n        ";
    }
    Object.defineProperty(qDeleteToken.prototype, "name", {
        get: function () { return this.constructor.name; },
        enumerable: true,
        configurable: true
    });
    return qDeleteToken;
})();
var qUpdateToken = (function () {
    function qUpdateToken(token) {
        this.text = "\n                UPDATE tokens\n                SET\n                    status = " + token.status + ",\n                    updated_on = '" + token.updatedOn + "'\n                WHERE\n                    id = " + token.id + ";\n        ";
    }
    Object.defineProperty(qUpdateToken.prototype, "name", {
        get: function () { return this.constructor.name; },
        enumerable: true,
        configurable: true
    });
    qUpdateToken.prototype.toString = function () {
        return this.name;
    };
    return qUpdateToken;
})();
var qSelectAccountTokens = (function () {
    function qSelectAccountTokens(accountId, lock) {
        this.type = Query_1.ResultType.list;
        this.handler = tokenHandler;
        this.mutableModels = lock;
        this.text = "\n                SELECT\n                    id,\n                    account_id as \"accountId\",\n                    status,\n                    method,\n                    activation_token as \"activationToken\",\n                    expires_at as \"expiresAt\",\n                    validation_code as \"validationCode\",\n                    created_on as \"createdOn\",\n                    updated_on as \"updatedOn\"\n                FROM\n                    tokens\n                WHERE\n                    account_id = " + accountId + ";\n            ";
    }
    Object.defineProperty(qSelectAccountTokens.prototype, "name", {
        get: function () { return this.constructor.name; },
        enumerable: true,
        configurable: true
    });
    qSelectAccountTokens.prototype.toString = function () {
        return this.name;
    };
    return qSelectAccountTokens;
})();
exports.qSelectAccountTokens = qSelectAccountTokens;
//# sourceMappingURL=TestSetup.js.map