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
        // commit transaction release the connection back to the pool
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
    startTransaction?       : boolean;  // optional, default false
    validateImmutability?   : boolean;  // optional, default true
    validateHandlerOutput?  : boolean;  // optional, default true
```
The meaning of these options will be explained below

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

The `doa.sync(commitTransaction?: boolean)` method will actually synchronize all pending model changes with the database (more on this below), and when true is passed for the optional `commitTransaction` parameter, will also commit the active transaction. Calling `dao.sync(true)` when no transactions are in progress will throw an error.

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
DAO is considered to be active from the point it is created, and until the point it is released (or until the point query execution error happens).

To check whether DAO is in transaction, the following property can be used:

 ```JavaScript
dao.inTransaction : boolean;
```
DAO is considered to be in transaction from the point `startTransaction()` method is called, and until the transaction is committed or rolled-back.

## Querying the Database
