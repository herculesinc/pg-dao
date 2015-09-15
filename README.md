# pg-dao

Simple promise-based data access layer for PostgreSQL written on top of [pg-io](https://github.com/herculesinc/pg-io).

## Use Case

Just as pg-io, pg-dao is best used when connection to the database is needed for a series of short requests and then can be released (e.g. web server scenarios). If you need to have a connection to execute long running queries (or queries that return large amounts of data), pg-dao is probably not for you.

pg-dao provides:
  * Ability to run raw queries against a database
  * Simple transaction management
  * Ability to define managed models (for automated model syncing with the database)

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

  * [Obtaining Database Connection](#obtaining-database-connection)
  * [Managing Transactions](#managing-transactions)
  * [Querying the Database](#querying-the-database)
  * [Working with Models](#working-with-models)
    - [Defining Models](#defining-models)
    - [Retrieving Models](#retrieving-models)
    - [Modifying and Syncing Models](#modifying-and-syncing-models)
	
# API
## Obtaining Database Connection

pg-dao exposes a single function at the root level which can be used to obtain a reference to a database object:

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
The returned Database object can be used further to establish a connection to the database. Creation of the database object does not establish a database connection but rather allocates a pool to hold connections to the database specified by the settings object.

Calling `db()` method multiple times with the same settings will return the same Database object. However, if different settings are supplied, different connection pools will be created.

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

pg-dao supports a simple transactions mechanism. Queries executed when DAO is in transaction mode will all be a part of a single transaction. It is possible to start and commit multiple transactions within the same DAO session, but only one transaction roll-back per sessions is allowed.

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

### Exiting Transaction Mode

DAO exits transaction mode when the transaction is either committed or rolled back.

Committing a transaction can be done via the following methods:
  * dao.sync(true) : Promise<any>;
  * dao.release('commit'): Promise<any>;

Rolling back a transaction can be done via the following method:
  * dao.release('rollback'): Promise<void>;

The `doa.sync(commitTransaction?: boolean)` method will actually synchronize all pending model changes with the database (more on this later), and when true is passed for the optional `commitTransaction` parameter, will also commit the active transaction. Calling `dao.sync(true)` when no transactions are in progress will throw an error.

The `dao.release(action?: string)` method must always be called once database connection is no longer needed. It will release the connection back to the pool and based on what is supplied for the `action` parameter will either commit or roll back the active transaction.

In general, the meaning of the `action` parameter is as follows:

  * 'commit' - if there is an active transaction it will be committed. The method will still execute without errors if no transactions are in progress
  * 'rollback' - if there is an active transaction it will be rolled back. The method will execute without errors if no transactions are in progress
  * undefined - if not transaction was started on the connection, `dao.release()` method can be called without `action` parameter. However, if a transaction is in progress, and action parameter is omitted, an error will be thrown and the active transaction will be rolled back before the connection is released back to the pool

Once DAO is released back to the pool, DAO object will become inactive and trying to execute queries on it will throw errors.

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
DAO is considered to be in transaction from the point `startTransaction()` method is called, and until the transaction is committed or rolled-back.

## Querying the Database
Once reference to DAO object is obtained it can be used to execute queries against the database using `dao.execute()` method.

```JavaScript
// executes a single query - and return a promise for the result
dao.execute(query) : Promise<any>;

// execute multiple queries and return a map of results
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

  * If only `text` property is provided: query will be executed against the database but no results will be returned to the user (even for SELECT statements). This is suitable for executing most INSERT, UPDATE, and DELTE commands
  * `mask` property is provided: query will be executed and the results will be returned to the user. This is suitable for executing most SELECT commands. `mask` property can have one of the following values:
    - 'list' - an array of rows retrieved from the database will be returned to the user (or `[]` if no rows were returned)
    - 'object' - first row retrieved from the database will be returned to the user (or `undefined` if no rows were returned)
  * `name` property is provided: when `execute()` is called with an array of queries, the returned map of results will be indexed by query name. For queries which don't have a name, the results will be held under the `undefined` key. If several executed queries have the same name, an array of results will be stored under they key for that name
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
  // result is a map layed out as follows:
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

  * boolean - always inlined
  * number - always inlined
  * Date - converted to ISO string and always inlined
  * string - if the string is safe, it is inlined, otherwise the query is executed as a parametrized query
  * object - serialized using `JSON.stringify()` and if the resulting string is safe, inlined; otherwise the query is executed as parametrized query
  * arrays - not supported
  * functions - not supported
  
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

### Query execution errors
If an error is thrown during query execution or query result parsing, DAO will be immediately released back to the pool. If DAO is in transaction, then the transaction will be rolled back. Basically, any error generated within the execute method will render the DAO object useless and no further communication with the database through this connection object will be possible.

## Working with Models

pg-dao provides a very flexible mechanism for defining managed model. Once models are defined, pg-dao takes care of synchronizing models with the database whenever changes are made.

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
Model handler is an object which provides services needed by DAO to work with the model. Model handler must have the following form:

```JavaScript
{
  parse(row: any): any;
  clone(model: any): any;
  areEqual(model1: any, model2: any): boolean;
  infuse(target: any, source: any);
  getSyncQueries(original: any, current: any): Query[];
}
```
The meaning of the above methods is described below:

  * parse(row) - should take a single database row as input and return a model object
  * clone(model) - should take a model as an input and produce a new object identical to the original model
  * areEqual(model1, model2) - should return true if both models are identical
  * infuse(target, source) - should change the properties of the `target` to make it identical to the `source`
  * getSyncQueries(original, current) - given the original and the current state of the model, should produce an array of queries that should be run to synchronize the model with the database
  
Below is an example of a very simple `User` model. For this model, the data is stored in the `users` table which has `id`, `username`, `created_on`, and `updated_on` fields.
```JavaScript
// import symbols used by pg-dao
import { symbols } from 'pg-dao';

// define User class (TypeScript syntax is used)
class User {
    id          : number;
    username    : string;
    createdOn   : Date;
    updatedOn   : Date;

    constructor(row: any) {
        this.id = row.id;
        this.username = row.username;
        this.createdOn = row.createdOn;
        this.updatedOn = row.updatedOn;
    }
}

// define User handler
var userHandler = {
  
    parse: (row) => {
        var user = new User(row);
        user[symbols.handler] = this;
        return user;
    }

    clone: (user) => {
        var clone = new User(user);
        clone[symbols.handler] = this;
        return clone;
    }
    
    areEqual: (user1, user2) => {
        if (user1 === undefined || user2 === undefined) return false;
        return (user1.id === user2.id
            && user1.username === user2.username
            && user1.createdOn.valueOf() === user2.createdOn.valueOf()
            && user1.updatedOn.valueOf() === user2.updatedOn.valueOf());
    }
    
    infuse: (target, source) => {
        assert.equal(target.id, source.id);
        target.username = source.username;
        target.createdOn = source.createdOn;
        target.updatedOn = source.updatedOn;
    }
    
    getSyncQueries: (original, current) => {
        var queries: Query[] = [];
        if (original === undefined && current !== undefined) {
            queries.push({
              text: `INSERT INTO users (id, username, created_on, updated_on) 
                      SELECT {{id}}, {{username}}, {{createdOn}}, {{updatedOn}};`,
              params: current
            });
        }
        else if (original !== undefined && current === undefined) {
            queries.push({
              text: `DELETE FROM users WHERE id = ${original.id};`
            });
        }
        else if (original !== undefined && current !== undefined) {
            queries.push({
              text: `UPDATE users SET
                        username = {{username}},
                        updated_on = {{updatedOn}}
                        WHERE id = ${user.id};`,
              params: current
            });
        }

        return queries;
    }
};

```

### Retrieving Models

Retrieving models from the database can be done via the regular `dao.execute()` method. The main difference from executing regular queries is that model queries should have `ModelHandler` specified for the `handler` property and can have an additional `mutable` property to specify whether retrieved models can be updated.

For example, given the User model defined above, a query to retrieve a single user by ID would look like this:

```JavaScript
var userId = 1;
var qFetchUserById = {
  text: `SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
          FROM users WHERE id = ${userId};`,
  mask: 'object',
  handler: userHandler,
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
  handler: userHandler,
  mutable: false
};

dao.execute(qFetchUsersByIdList).then((users) => {
  // users is now an array of 3 User model retrieved from the database
});
```

Retriving the same model multiple times does not create a new model object - but rather updates an existing model object with fresh data from the database:

```JavaScript
var userId = 1;
var qFetchUserById = {
  text: `SELECT id, username, created_on AS "createdOn", updated_on AS "updatedOn"
          FROM users WHERE id = ${userId};`,
  mask: 'object',
  handler: userHandler,
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
  handler: userHandler,
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

### Modifying and Syncing Models

For models which were retrieved from the database as mutable, DAO observes the changes and then writes changes out to the database on `dao.sync()` call or on `dao.release('commit')` call.

#### Updating Models

Updating existing models is done simply by modifying model properties. No additional works is needed:

```JavaScript
dao.startTransaction.then(() => {
  // retrieve user model from the database
  return dao.execute(qFetchUserById).then((user) => {
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
  return dao.execute(qFetchUserById).then((user) => {
    dao.destroy(user);
    dao.isDestroyed(user); // true
  });
})
// sync changes with the database and release connection
.then(() => dao.release('commit'));
```

#### Creating Models

pg-dao does not handle creation of model objects, but once a model object is created, it can be inserted into the database using `dao.insert()` method:

```JavaScript
// create a new model object
var user = userHandler.parse({
  id: 1, 
  username: 'test', 
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
If this method is called on a new model, the model will be removed form DAO.

#### Syncing Changes

All pending model changes must be either committed or rolled-back upon DAO release. This can be done as follows:

  * `dao.release('commit')` - this will write out all pending model changes to the database, commit any active transactions, and release connection back to the pool
  * `dao.release('rollback')` - this will revert any pending model changes, rollback any active transaction, and release connection back to the pool

If `dao.release()` is called without any parameters and there are pending model changes, the changes will be discarded, any active transaction will be rolled back, and an error will be thrown. 

It is also possible to sync model changes with the database without releasing DAO connection by using `dao.sync()` method as follows:

  * `dao.sync()` - this will write all pending model changes to the database
  * `dao.sync(true)` - this will write all pending model changes to the database and commit any active database transactions

`dao.sync()` method returns an array describing synchronized changes. The objects have the following form:

```
{
  original: any, // state of the model when it was read in from the database
  current: any   // state of the model that was written out to the database
}
```

pg-dao does not actively enforce model immutability. This means that models retrieved as immutable can still be modified by the user. As pg-dao only observes mutable models, any changes to immutable models will be ignored. However, it is possible to force pg-dao to validate model immutability on syncing changes. This can be done via setting `validateImmutability` property for the connection to true. In such a case, if any changes to immutable models are detected during model synchronization, an error will be thrown. There are performance implications to setting `validateImmutability` property to true - so, it might be a good idea to use it in development environments only.

#### Checking Model State

It is possible to check the state of DAO as well as the state of a specific model using the following methods:

```JavaScript
dao.isSynchronized() : boolean  // returns false if DAO has any pending changes
dao.isModified(model): boolean  // returns true if the model has pending changes
dao.isNew(model): boolean       // returns true if the new model has not yet been saved to the database
dao.isDestroyed(model): boolean // returns true if the deleted model has not yet been removed from the databsae
```

To check whether a model is registered with DAO the following method can be used:

```JavaScript
dao.hasModel(model) : boolean
```

## License
Copyright (c) 2015 Hercules Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
