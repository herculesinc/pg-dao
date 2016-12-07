// TIMESTAMP
// ================================================================================================
export type Timestamp = number;

export namespace Timestamp {

    export function parse(value: any): Timestamp {
        if (Number.isInteger(value)) return value;
        const ts = Number.parseInt(value, 10);
        
        if (!Number.isInteger(ts)) throw new TypeError(`Cannot parse a timestamp: value ${value} is invalid`)
        return ts;
    }
}