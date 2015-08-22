// Type definitions for pg
// Project: https://github.com/brianc/node-postgres
// Definitions by: Phips Peter <http://pspeter3.com>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/// <reference path="../node/node.d.ts" />

declare module "pg" {
    import events = require("events");
    import stream = require("stream");

    export function connect(connection: string, callback: (err: Error, client: Client, done: () => void) => void): void;
    export function connect(config: ClientConfig, callback: (err: Error, client: Client, done: () => void) => void): void;
    export function end(): void;

    export var types: Types;
    export var defaults: Defaults;
    export var pools: ClientPoolCollection;

    export interface Types {
        getTypeParser(oid: number);
        setTypeParser(oid: number, parseFn: (any) => any);
    }

    export interface ConnectionConfig {
        user?: string;
        database?: string;
        password?: string;
        port?: number;
        host?: string;
    }

    export interface Defaults extends ConnectionConfig {
        poolSize?: number;
        poolIdleTimeout?: number;
        reapIntervalMillis?: number;
        binary?: boolean;
        parseInt8?: boolean;
    }

    export interface ClientConfig extends ConnectionConfig {
        ssl?: boolean;
    }

    export interface QueryConfig {
        name?: string;
        text: string;
        values?: any[];
        multiResult?: boolean;
        rowMode?: string;
    }

    export interface QueryResult {
        rows: any[];
        fields: FieldDescriptor[];
    }

    export interface FieldDescriptor {
        name: string;
    }

    export interface ClientPoolCollection {
        getOrCreate(key?: any): ClientPool;
    }

    export interface ClientPool {
        getName(): string;
        getPoolSize(): number;
        availableObjectsCount(): number;
        waitingClientsCount(): number;

        acquire(callback: (err: Error, client: Client) => void);
        release(client: Client);
    }

    export interface ResultBuilder extends QueryResult {
        command: string;
        rowCount: number;
        oid: number;
        addRow(row: any): void;
    }

    export class Client extends events.EventEmitter {
        constructor(connection: string);
        constructor(config: ClientConfig);

        connect(callback?: (err: Error) => void): void;
        end(): void;

        query(queryText: string, callback?: (err: Error, result: QueryResult) => void): Query;
        query(config: QueryConfig, callback?: (err: Error, result: QueryResult | QueryResult[]) => void): Query;
        query(queryText: string, values: any[], callback?: (err: Error, result: QueryResult) => void): Query;

        copyFrom(queryText: string): stream.Writable;
        copyTo(queryText: string): stream.Readable;

        pauseDrain(): void;
        resumeDrain(): void;

        public on(event: "drain", listener: () => void): Client;
        public on(event: "error", listener: (err: Error) => void): Client;
        public on(event: "notification", listener: (message: any) => void): Client;
        public on(event: "notice", listener: (message: any) => void): Client;
        public on(event: string, listener: Function): Client;
    }

    export class Query extends events.EventEmitter {
        public on(event: "row", listener: (row: any, result?: ResultBuilder) => void): Query;
        public on(event: "error", listener: (err: Error) => void): Query;
        public on(event: "end", listener: (result: ResultBuilder) => void): Query;
        public on(event: string, listener: Function): Query;
    }

    export class Events extends events.EventEmitter {
        public on(event: "error", listener: (err: Error, client: Client) => void): Events;
        public on(event: string, listener: Function): Events;
    }
}