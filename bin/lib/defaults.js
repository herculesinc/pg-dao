"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const pg_io_1 = require("pg-io");
exports.defaults = pg_io_1.defaults;
const util = require("./util");
// SET DEFULTS
// ================================================================================================
// set extended defaults
pg_io_1.defaults.session.validateImmutability = true;
pg_io_1.defaults.session.validateHandlerOutput = true;
pg_io_1.defaults.session.manageUpdatedOn = true;
// set encryptor and decryptor
pg_io_1.defaults.crypto = {
    secretSault: 'saultPlaceholder',
    secretToKey: util.secretToKey,
    encryptor: util.encrypt,
    decryptor: util.decrypt
};
//# sourceMappingURL=defaults.js.map