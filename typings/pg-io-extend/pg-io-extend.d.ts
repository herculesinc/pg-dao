declare module "pg-io" {
    export interface SessionOptions {
        validateImmutability?   : boolean;
        validateHandlerOutput?  : boolean;
        manageUpdatedOn?        : boolean;
    }
}