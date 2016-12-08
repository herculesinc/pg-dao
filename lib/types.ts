// IMPORTS
// ================================================================================================
import { ModelError } from './errors';

// TIMESTAMP
// ================================================================================================
export type Timestamp = number;

export namespace Timestamp {

    export function parse(value: any): Timestamp {
        if (value === null || value === undefined) return undefined;
        if (Number.isInteger(value)) return value;
        const ts = Number.parseInt(value, 10);
        
        if (!Number.isInteger(ts)) throw new ModelError(`Cannot parse a timestamp: value ${value} is invalid`)
        return ts;
    }
}