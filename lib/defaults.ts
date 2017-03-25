// IMPORTS
// ================================================================================================
import { defaults } from 'pg-io';
import * as util from './util';

// SET DEFULTS
// ================================================================================================

// set extended defaults
defaults.session.validateImmutability    = true;
defaults.session.validateHandlerOutput   = true;
defaults.session.manageUpdatedOn         = true;

// set encryptor and decryptor
defaults.crypto = {
    secretSalt  : 'saltPlaceholder',
    secretToKey : util.secretToKey,
    encryptor   : util.encrypt,
    decryptor   : util.decrypt
};

// RE-EXPORT
// ================================================================================================
export { defaults };