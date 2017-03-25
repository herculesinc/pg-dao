declare module "pg-io" {
    export interface SessionOptions {
        validateImmutability?   : boolean;
        validateHandlerOutput?  : boolean;
        manageUpdatedOn?        : boolean;
    }

    export interface Defaults {
        crypto: {
            secretSalt  : string;
            secretToKey : (secret: string) => Buffer;
            encryptor   : (plaintext: string, key: Buffer) => string;
            decryptor   : (ciphertext: string, key: Buffer) => string;
        };
    }
}