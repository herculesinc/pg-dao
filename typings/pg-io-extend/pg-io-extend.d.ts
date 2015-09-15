declare module "pg-io" {
    export interface ConnectionOptions {
        validateImmutability?   : boolean;
        validateHandlerOutput?  : boolean;
        manageUpdatedOn?        : boolean;
    }
}