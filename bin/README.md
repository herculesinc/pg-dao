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
$ npm install -save pg-dao
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
    - [Syncing Models](#syncing-models)
	
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

#### Checking DAO State
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

### Defining Models

### Retrieving Models

### Syncing Models

## License
Copyright (c) 2015 Hercules Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.