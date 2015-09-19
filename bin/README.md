# pg-dao
Simple promise-based data access layer for PostgreSQL written on top of [pg-io](https://github.com/herculesinc/pg-io).

## Usage
pg-dao is designed for scenarios when connection to the database is needed for a series of short and relatively simple requests. If you need a connection to execute long running queries (or queries that return large amounts of data) or require complex transaction logic, pg-dao is probably not for you.

pg-dao adheres to the following principles:
  * __Single transaction__ - only one transaction is allowed per connection session. A transaction can be started at any point during the session, and can be committed (or rolled back) only at the end of the session
  * __Low error tolerance__ - any error in query execution will terminate the session and release the connection back to the pool

The above would work well for many web-server scenarios when connection is needed to process a single user request. If an error is encountered during the request, all changes are rolled back, an error is returned to the user, and the connection is released to handle next user request. 

In addition to the functionality of pg-io, pg-dao provides a flexible managed model mechanism to make syncing data with the database simpler.

## Requirements
pg-dao is written in TypeScript and compiled down to JavaScript (ES6). Aa such, it can be used in any JavaScript application which complies with runtime requirements of pg-dao. The most recent version of pg-dao __requires Node.js 4.1 or later__ as it relies heavily on many ES6 features such as classes, arrow functions, built-in promises etc. 

Since pg-dao is ES6-centric, many examples below utilize ES6 syntax. Some examples also use TypeScript syntax to communicate expected types of variables.

## Install

```sh
$ npm install --save pg-dao
```

## Example

```JavaScript
import * as pg from 'pg-dao';

var settings = { /* connections settings */ };

// connect to the database
pg.db(settings).connect().then((dao) => {

    // create a query object
    var query = {
        text: 'SELECT * FROM users WHERE status = {{status}};',
        params: {
            status: 'active'
        },
        mask: 'list'
    };
	
    // start a transaction
    return dao.startTransaction()
        // execute the query
        .then(() => dao.execute(query))
        .then((results) => {
            // do some work with results
            // maybe run some other queries to update the database
        })
        // commit transaction and release the connection back to the pool
        .then(('commit') => dao.release('commit'));
});
```

## API Reference

Complete public API definitions can be found in [pg-dao.d.ts]( https://github.com/herculesinc/pg-dao/blob/master/pg-dao.d.ts) file. The below sections will explain in more detail how the API can be used for specific tasks:

  * [Obtaining Database Connection](#obtaining-database-connection)
  * [Managing Transactions](#managing-transactions)
  * [Querying the Database](#querying-the-database)
  * [Working with Models](#working-with-models)
    - [Defining Models](#defining-models)
    - [Retrieving Models](#retrieving-models)
    - [Modifying and Syncing Models](#modifying-and-syncing-models)
	* [Errors](#errors)
  
# API
## Obtaining Database Connection

pg-dao exposes a single function at the root level which can be used to obtain a reference to a Database object:

```JavaScript
function db(settings) : Database;
```
where `settings` should have the following form:
```
{
    host        : string;
    port?       : number;  // optional, default 5432
    user        : string;
    password    : string;
    database    : string;
    poolSize?   : number;  // optional, default 10
}
```
The returned Database object can be used further to establish a connection session to the database. Creation of the database object does not establish a database connection but rather allocates a pool to hold connections to the database specified by the settings object.

Calling `db()` method multiple times with the same settings will return the same Database object. However, if different settings are provided, different connection pools will be created.

### Database
Once a reference to a Database object is obtained, it can be used to establish a connection session using the following method:

```JavaScript
database.connect(options?) : Promise<Dao>;
```
The method returns a promise for a DAO object which represents a connection session.

The optional `options` object has the following form:

```
{
    startTransaction?       : boolean;  // optional, default false
    validateImmutability?   : boolean;  // optional, default true
    validateHandlerOutput?  : boolean;  // optional, default true
    manageUpdatedOn?        : boolean;  // optional, default true
}
```
The meaning of these options will be explained in the following sections.

Additionally, Database object exposes a method for checking connection pool state:

```JavaScript
database.getPoolState() : PoolState;
```

where PoolState has the following form:
```
{
    size      : number; // current size of the connection pool
    available : number; // number of available connections in the pool
}
```

Database **connections must always be released** after they are no longer needed by calling `dao.release()` method (more on this below). If you do not release connections, connection pool will be exhausted and bad things will happen.

## Managing Transactions

pg-dao supports a simple transactions mechanism. Queries executed when DAO is in transaction mode will all be a part of a single transaction. Only one transaction is allowed per connection session. A transaction can be started at any point during the connection session, and must be committed or rolled back when the connection is released back to the pool.

### Entering Transaction Mode
Starting a transaction can be done via the following method:

```JavaScript
dao.startTransaction(lazy?) : Promise<void>;
```

If an optional `lazy` parameter is set to true (the default), the transaction will be started upon the first call to `dao.execute()` method. If `lazy` is set to false, the transaction will be started immediately.

It is also possible to start a transaction at the time of DAO creation by setting `startTransaction` option to true for the `database.connect()` method:

```JavaScript
import * as pg from 'pg-dao';

var settings = { /* connections settings */ };

pg.db(settings).connect({ stratTransaction: true }).then((dao) => {

  // DAO is now in transaction and all queries executed
  // through this connection will be executed in a single transaction 
	
  return dao.release('commit');
});
```

In the above example, the transaction is actually not started immediately but is delayed until the first call to `dao.execute()` method (this is basically equivalent to starting a transaction in `lazy` mode).

Do not start transactions manually by executing `BEGIN` commands. Doing so will confuse the DAO object and bad things may happen.

### Exiting Transaction Mode

DAO exits transaction mode when the transaction is either committed or rolled back. This can only be done at the end of the connection session using the following method:

```
connection.release(action?) : Promise<void>;
```

where `action` parameter is as follows:

  * __'commit'__ - if there is an active transaction it will be committed
  * __'rollback'__ - if there is an active transaction it will be rolled back
  * __undefined__ - if no transactions were started on the connection, `dao.release()` method can be called without `action` parameter. However, if a transaction is in progress, and action parameter is omitted, an error will be thrown and the active transaction will be rolled back before the connection is released back to the pool

In the example below, query1 and query2 are executed in the context of the same transaction, then transaction is committed and DAO is released back to the pool.
```JavaScript
dao.startTransaction()
  .then(() => {
    var query1 = { ... };
    return dao.execute(query1);
  })
  .then((query1Result) => {
    var query2 = { ... };
    return dao.execute(query);
  })
  .then((query2Result) => dao.release('commit'));
```

Once the connection is released back to the pool, DAO object will become inactive and trying to execute queries on it will throw errors.

### Checking DAO State
To check whether DAO is active, the following property can be used:
 ```JavaScript
dao.isActive : boolean;
```
DAO is considered to be active from the point it is created, and until the point it is released (or until query execution error happens).

To check whether DAO is in transaction, the following property can be used:

 ```JavaScript
dao.inTransaction : boolean;
```
DAO is considered to be in transaction from the point `startTransaction()` method is called, and until the transaction is committed or rolled back.

## Querying the Database
Once reference to DAO object is obtained it can be used to execute queries against the database using `dao.execute()` method.

```JavaScript
// executes a single query - and return a promise for the result
dao.execute(query) : Promise<any>;

// execute multiple queries and return a promise for a map of results
dao.execute([query1, query2]) : Promise<Map>;
```

A query object passed to the execute method should have the following form:

```
{
    text    : string;
    mask?   : string;
    name?   : string;
    params? : any;
    handler?: ResultHandler;
}
```

The only required property for a query is `text`, however, the behavior of the `execute()` method is directly controlled by other query properties. The behaviors are as follows:

  * If only `text` property is provided: query will be executed against the database but no results will be returned to the user (even for SELECT statements). This is suitable for executing most INSERT, UPDATE, and DELETE commands
  * `mask` property is provided: query will be executed and the results will be returned to the user. This is suitable for executing most SELECT commands. `mask` property can have one of the following values:
    - 'list' - an array of rows retrieved from the database will be returned to the user (or `[]` if no rows were returned)
    - 'object' - first row retrieved from the database will be returned to the user (or `undefined` if no rows were returned)
  * `name` property is provided: when `execute()` is called with an array of queries, the returned map of results will be indexed by query name. The following caveats apply:
    - For queries which don't have a `name` property, the results will be held under the `undefined` key
    - If several executed queries have the same name, an array of results will be stored under the key for that name
  * `params` - query will be parametrized with the provided object (more info below)
  * `handler` - query results will be parsed using custom logic (more info below)

A few examples of executing different queries:

```JavaScript
var query1 = {
	text: `UPDATE users SET username = 'User1' WHERE id = 1;`
};
dao.execute(query1).then((result) => {
  // result is undefined
});

var query2 = {
	text: 'SELECT * FROM users;',
	mask: 'list'
};
dao.execute(query2).then((result) => {
  // result is an array of user objects
  var user1 = result[0];
});

var query3 = {
	text: 'SELECT * FROM users WHERE id = 1;',
	mask: 'object'
};
dao.execute(query3).then((result) => {
  // result is a single user object
  var user1 = result;
});

dao.execute([query1, query2, query3]).then((result) => {
  // result is a map layed out as follows:
  // result.get(undefined)[0] contains results from query2
  var user1 = result.get(undefined)[0][0];
  
  // result.get(undefined)[1] contains results from query3
  var user2 = result.get(undefined)[1];
  
  // results from query1 are not in the map
});

var query4 = {
	text: 'SELECT * FROM users;',
	mask: 'list',
	name: 'q1'
};

var query5 = {
	text: 'SELECT * FROM users WHERE id = 1;',
	mask: 'object',
	name: 'q2'
};

dao.execute([query4, query5]).then((result) => {
  // result is a map laid out as follows:
  // result.get(query4.name) contains results from query4
  var user1 = result.get(query4.name)[0];
  
  // result.get(query5.name) contains results from query5
  var user2 = result.get(query5.name);
});
```
### Parametrized Queries

Queries can be parametrized using named parameters. Parameters must be enclosed in `{{}}` brackets and `params` object should be provided with parameter values. 

```JavaScript
var query = {
  text: 'UPDATE users SET username = {{username}} WHERE id = {{id}};',
  params: {
    username: 'joe',
    id: 1
  }
};

dao.execute(query).then(() => {
  // the query is executed as
  // UPDATE users SET username = 'joe' WHERE id = 1;
});
```

Safe parameters (e.g. booleans, numbers, safe strings) are inlined into the query text before the query is sent to the database. If one of the parameters is an unsafe string, the query is executed as a parametrized query on the database to avoid possibility of SQL-injection. In general, properties in the `params` object are treated as follows:

  * __boolean__ - always inlined
  * __number__ - always inlined
  * __Date__ - converted to ISO string and always inlined
  * __string__ - if the string is safe, it is inlined, otherwise the query is executed as a parametrized query
  * __object__ - object parameters are treated as follows:
    - `valueOf()` method is called on the object and if it returns a number, a boolean, a safe string, or a date, the value is inlined; if the returned value is an unsafe string, the query is executed as parametrized query
    - if `valueOf()` method returns an object, the parameter is converted to string using `JSON.stringify()` and if the resulting string is safe, inlined; otherwise the query is executed as parametrized query
  * __arrays__ - arrays are parametrized as follows:
    - arrays of numbers are always inlined using commas as a separator
    - arrays of strings are either inlined (if the strings are safe) or sent to the database as parametrized queries (if strings are unsafe)
    - all other array types (and arrays of mixed numbers and strings) are not supported and will throw errors
  * __null__ or __undefined__ - always inlined as 'null'
  * __functions__ - not supported, will throw errors
  
Examples of array parametrization:
```JavaScript
var query1 = {
  text: 'SELECT * FROM users WHERE id IN ({{ids}});',
  params: {
    ids: [1, 2]
  }
};
// query1 will be executed as:
// SELECT * FROM users WHERE id IN (1,2);

var query2 = {
  text: 'SELECT * FROM users WHERE type IN ({{types}});',
  params: {
    types: ['personal', 'business']
  }
};
// query2 will be executed as:
// SELECT * FROM users WHERE type IN ('personal','business');

var query3 = {
  text: 'SELECT * FROM users WHERE name IN ({{names}});',
  params: {
    names: [`Test`, `T'est`, `Test2` ]
  }
};

// query3 will be executed as:
// SELECT * FROM users WHERE firstName IN ('Test',$1,'Test2');
  
### Result Parsing

It is possible to parse query results using custom logic by providing a ResultHandler object for a query. The handler object must have a single `parse()` method which takes a row as input and produces custom output. For example:

 ```JavaScript
var query = {
  text: 'SELECT * FORM users;',
  handler: {
    parse: (row) => row.id
  }
};

dao.execute(query).then((result) => {
  // the result will contain an array of user IDs
});
```

## Working with Models

pg-dao provides a very flexible mechanism for defining managed models. Once models are defined, pg-dao takes care of synchronizing models with the database whenever changes are made.

### Defining Models

Any object can be a model as long as the object has the following properties:
```
{
  id       : number,       // unique identifier for the model
  createdOn: Date,         // date on which the model was created
  updatedOn: Date          // date on which the model was last updated
  [handler]: ModelHandler  // handler for the model (described below)
}
```
ModelHandler is an object which provides services needed by DAO to work with the model. Model handler must have the following form:

```JavaScript
{
  parse(row: any): Model;
  clone(model: Model): Model;
  areEqual(model1: Model, model2: Model): boolean;
  infuse(target: Model, source: Model);
  getSyncQueries(original: Model, current: Model): Query[];
  getFetchOneQuery(selector: any, forUpdate: boolean, name?: string): Query;
  getFetchAllQuery(selector: any, forUpdate: boolean, name?: string): Query;
}
```
The meaning of the above methods is described below:

  * __parse(row)__ - should take a single database row as input and return a model object
  * __clone(model)__ - should take a model as an input and produce a new object identical to the original model
  * __areEqual(model1, model2)__ - should return true if both models are identical
  * __infuse(target, source)__ - should change the properties of the `target` model to make it identical to the `source` model
  * __getSyncQueries(original, current)__ - given the original and the current state of the model, should produce an array of queries which can be executed to synchronize the model with the database
  * __getFetchOneQuery__ - given the selector, returns a query which can be executed to retrieve a single model
  * __getFetchAllQuery__ - given the selector, returns a query which can be executed to retrieve a list of models

The above mechanism is extremely flexible and allows the user to define models of nearly arbitrary complexity (e.g. it is possible to implement models which span multiple tables and contain complex object hierarchies). However, it would be extremely tedious to manually define handlers for all models from scratch. To make this task simpler, pg-dao provides a base class called `AbstractModel` which implements most of the boilerplate functionality for you.

Below is an example of a very simple `User` model implemented by extending `AbstractModel` base class. For this model, the data is stored in the `users` table which has `id`, `username`, `created_on`, and `updated_on` fields.

```JavaScript
import { AbstractModel, symbols } from 'pg-dao';

class User extends AbstractModel {    
    constructor(seed: any) {
        super(seed);
        this.username = seed.username;
    }
}

// define the name of the table for the model
User[symbols.dbTable] = 'users';
// define the schema for the model
User[symbols.dbSchema] = {
    id        : Number,
    username  : String,
    createdOn : Date,
    updatedOn : Date
};
```

The above will create a fully functional User model. However, the steps of manually setting table name and schema are still cumbersome. If you are using TypeScript, this can be avoided by using decorators as follows:

```TypeScript
import { AbstractModel, dbModel, dbField } from 'pg-dao';

@dbModel('users')
export class User extends AbstractModel {
    
    @dbField(String)
    username: string;
    
    constructor(seed: any) {
        super(seed);
        this.username = seed.username;
    }
}
```

Both of the above code snippets will produce an identical model - but TypeScript provides a cleaner syntax.

The models can be further customized almost at will. For example, providing a specialized fetch query can be done as follows:

```TypeScript
import { AbstractModel, dbModel, dbField } from 'pg-dao';

@dbModel('users')
export class User extends AbstractModel {
    
    @dbField(String)
    username: string;
    
    constructor(seed: any) {
        super(seed);
        this.username = seed.username;
    }
    
    static getFetchAllQuery(selector: any, forUpdate = false, name?: string) {
        
        if ('conversationId' in selector) {
            // fetch all users participating in a specific conversation
            return {
                text: `SELECT ... FROM users WHERE id IN 
                        (SELECT user_id FROM conversations WHERE id = ${selector.conversationId});`,
                mask: 'list',
                handler: this,
                mutable: forUpdate,
                name: name
            };
        }
        else {
            return super.getFetchAllQuery(selector, forUpdate, name);
        }
    }
}
```

Using `AbstractModel` (as opposed to defining model handler from scratch) does impose a few limitations:

  * model `constructor` must be able to build the model out of either a database row or another model. Specifically, the following should be possible:
  
  ```JavaScript
  var row = /* row retrieved from the database */
  var model1 = new User(row); // creates a model from a database row
  var model2 = new User(model1); // clones the original model
  ```
  
  * all model properties must be in camelCase while all database fields must be in snake_case. `AbstractModel` assumes this conventions and queries generated automatically will have syntax errors if this convention is not adhered to
  * all models of the same type must be stored in a single table (models spanning multiple tables are not possible). For example, for the User model above, the model is stored in a single table called `users`

### Retrieving Models

Retrieving models from the database can be done via the regular `dao.execute()` method or via specialized `fetchOne()` and `fetchAll()` methods. 

#### Retrieving via execute()
The main difference from executing regular queries is that model queries should have `ModelHandler` specified for the `handler` property and can have an additional `mutable` property to specify whether retrieved models can be updated. For example, given the User model defined above, a query to retrieve a single user by ID would look like this:

```JavaScript
var userId = 1;
var qFetchUserById = {
  text: `SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
          FROM users WHERE id = ${userId};`,
  mask: 'object',
  handler: User,
  mutable: false
};

dao.execute(qFetchUserById).then((user) => {
  // user is now User model retrieved from the database
});
```

A query to retrieve multiple users by ID could look like this:

```JavaScript
var userIdList = [1, 2, 3];
var qFetchUsersByIdList = {
  text: `SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
          FROM users WHERE id IN (${userIdList.join(',')});`,
  mask: 'list',
  handler: User,
  mutable: false
};

dao.execute(qFetchUsersByIdList).then((users) => {
  // users is now an array of 3 User model retrieved from the database
});
```

Retrieving the same model multiple times does not create a new model object - but rather updates an existing model object with fresh data from the database (this effectively reloads the model in memory):

```JavaScript
var userId = 1;
var qFetchUserById = {
  text: `SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
          FROM users WHERE id = ${userId};`,
  mask: 'object',
  handler: User,
  mutable: false
};

dao.execute(qFetchUserById).then((user1) => {
  return dao.execute(qFetchUserById).then((user2) => {
    user1 === user2; // true
  });
});
```

The `mutable` property indicates whether the models retrieved by the query can be updated during the DAO session. Setting `mutable` to true instructs DAO to monitor the model and detect if any changes take place. This has performance implications, so setting `mutable` to true should be done only if you are planning to modify the models during the session. 

In some scenarios it might make sense to mark models as mutable only if `SELECT ... FOR UPDATE` statement was used to retrieve it from the database. For example, the following might be a query to select a user model for update:

```JavaScript
var userId = 1;
var qFetchUserById = {
  text: `SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
          FROM users WHERE id = ${userId} FOR UPDATE;`,
  mask: 'object',
  handler: User,
  mutable: true
};

dao.startTransaction.then(() => {
  return dao.execute(qFetchUserById).then((user) => {
    // user row with ID = 1 is now locked in the database - no other client 
    // can modify the row until this transaction is committed.
    // so, we can update the user model safely knowing that we have the most
    // recent version of the user data
  });
}).then(() => dao.release('commit'));

```

Checking whether the model was retrieved as mutable can be done as follows:

```JavaScript
dao.isMutable(model) : boolean;
```

#### Retrieving via fetch methods

If you only need to retrieve one type of model at a time, it might be easier to use `fetchOne()` or `fetchAll()` methods. The signatures of the methods are as follows:
```JavaScript
fetchOne(handler, selector, forEdit?): Model;
fetchAll(handler, selector, forEdit?): Model[];
```
The meaning of the parameters is as follows:
  * `handler` - model handler for which to retrieve models
  * `selector`- an object describing parameters based on which models should be selected
  * `forEdit` - an optional parameter (default false) indicating whether the retrieved models are mutable

For the User model defiend above, the fetch methods can be used as follows:
```JavaScript
  dao.fetchOne(User, { id: 1 }).then((user) => {
    // fetches User model with ID = 1 from the database
    // the fetched model is immutable
  });
  
  dao.fetchOne(User, { id: 2 }, true).then((user) => {
    // fetches User model with ID = 2 from the database
    // the fetched model is mutable
  });
  
  dao.fetchAll(User, { id: [2, 3] }).then((users) => {
    // fetches User models with IDs 2 and 3 from the database
    // the fetched models are immutable
  });
```

Internally, DAO fetch methods call model handler's get fetch query methods (`getFetchOneQuery()` and `getFetchAllQuery()`) and execute returned queries using `dao.execute()` method. So, any custom fetch queries defined for the model will automatically work in these methods too.

When working with models derived from `AbstractModel`, keep in mind that `FOR UPDATE` statement will be added to all automatically generated fetch queries when `forUpdate` parameter is set to true for `getFetchOneQuery()` and `getFetchAllQuery()` methods.

### Modifying and Syncing Models

For models which were retrieved from the database as mutable, DAO observes the changes and then writes changes out to the database on `dao.sync()` call or on `dao.release('commit')` call.

#### Updating Models

Updating existing models is done simply by modifying model properties. No additional works is needed:

```JavaScript
dao.startTransaction.then(() => {
  // retrieve user model from the database
  return dao.fetchOne(User, { id: 1 }, true).then((user) => {
    // update the model
    user.username = 'test';
    dao.isModified(user); // true
  });
})
// sync changes with the database and release connection
.then(() => dao.release('commit'));
```

#### Deleting Models

Deleting existing models can be done as follows:

```JavaScript
dao.startTransaction.then(() => {
  // retrieve user model from the database
  return dao.fetchOne(User, { id: 1 }, true).then((user) => {
    dao.destroy(user);
    dao.isDestroyed(user); // true
  });
})
// sync changes with the database and release connection
.then(() => dao.release('commit'));
```

#### Creating Models

pg-dao does not handle creation of model objects (yet), but once a model object is created, it can be inserted into the database using `dao.insert()` method:

```JavaScript
// create a new model object
var user = User.parse({
  id: 1, 
  username: 'Test', 
  createdOn: new Date(), 
  updatedOn: new Date()
});

dao.startTransaction.then(() => {
  // insert the model into DAO
  dao.insert(user);
  dao.isNew(user); // true
})
// sync changes with the database and release connection
.then(() => dao.release('commit'));
```

#### Reverting Changes

It is possible to revert the changes made to a model by using the following method:

```JavaScript
dao.clean(model);
```
The changes will be reverted to the point when last call to `dao.sync()` was made. If this method is called on a new model, the model will be removed form DAO.

#### Syncing Changes

All pending model changes must be either committed or rolled-back upon DAO release. This can be done as follows:

  * `dao.release('commit')` - this will write out all pending model changes to the database, commit any active transactions, and release connection back to the pool
  * `dao.release('rollback')` - this will revert any pending model changes, rollback any active transaction, and release connection back to the pool

If `dao.release()` is called without any parameters and there are pending model changes, the changes will be discarded, any active transaction will be rolled back, and an error will be thrown. 

It is also possible to sync model changes with the database without releasing DAO connection by using `dao.sync()` method.

`dao.sync()` method returns an array describing synchronized changes. The objects have the following form:

```
{
  original: any, // state of the model when it was read in from the database
  current: any   // state of the model that was written out to the database
}
```

`dao.release('commit')` call also returns an array of change objects, however, the `release()` method returns the complete set of changes that were performed during the DAO session, while the `sync()` method returns only the changes done since the lasts `sync()` call.

pg-dao does not actively enforce model immutability. This means that models retrieved as immutable can still be modified by the user. As pg-dao only observes mutable models, any changes to immutable models will be ignored. However, it is possible to force pg-dao to validate model immutability on syncing changes. This can be done via setting `validateImmutability` property for the connection to true. In such a case, if any changes to immutable models are detected during model synchronization, an error will be thrown. There are performance implications to setting `validateImmutability` property to true - so, it might be a good idea to use it in development environments only.

pg-dao will also automatically set `updatedOn` property of any models that have been updated to the current date upon model synchronization. This behavior can be overridden by setting `manageUpdatedOn` connection option to false.

#### Checking Model State

It is possible to check the state of a specific model using the following methods:

```JavaScript
dao.isModified(model) : boolean  // true if the model has pending changes
dao.isNew(model)      : boolean  // true if the new model has not yet been saved to the database
dao.isDestroyed(model): boolean  // true if the deleted model has not yet been removed from the databsae
```

This methods will throw an error if the model has not been registered with DAO. To check whether a model is registered with DAO the following method can be used:

```JavaScript
dao.hasModel(model) : boolean
```

To check whether DAO has any pending changes (updates, inserts, or deletes), the following method can be used:
```
dao.isSynchronized()  : boolean  // returns false if DAO has any pending changes
```

### Errors

pg-io provides several customized errors which extend the built-in Error object (via base PgError class). These errors are:

  * __ConnectionError__, thrown when:
    - establishing a database connection fails
    - an attempt to use an already released connection is made
    - an attempt to release an already released connection is made
  * __TransactionError__, thrown when:
    - an attempt is made to start a transaction on a connection which is already in transaction
    - a connection is released without committing or rolling back an active transaction
  * __QueryError__, thrown when:
    - executing of a query fails
  * __ParseError__, thrown when:
    - parsing of query results fails
  * __StoreError__, thrown when:
    - An attempt to change the state of in-memory models is made illegally (e.g. inserting the same model twice)
  * __SyncError__, thrown when:
    - a change to an immutable model is detected
    - a connection is released without committing or rolling back pending model changes
  * __ModelError__, throw when:
    - an inconsistent model is detected (e.g. model without `[handler]` property)

If an error is thrown during query execution, query result parsing, or model syncing, the connection will be immediately released back to the pool. If a connection is in transaction, then the transaction will be rolled back. Basically, any error generated within `dao.execute()` and `dao.sync()` method will render the connection object useless and no further communication with the database through this connection object will be possible. The connection itself will be released to the pool so that it can be used by other clients.

## License
Copyright (c) 2015 Hercules Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
