// IMPORTS
// ================================================================================================
import * as assert from 'assert';

import { symbols } from './../lib/AbstractModel';
import { User, Token } from './setup';

// MODEL STORE INITIALIZATION
// ================================================================================================
describe('Models: Definition', function () {
        
    it('User model should be defined correctly', function () {
		var dbTable = User[symbols.dbTable];
		var dbSchema = User[symbols.dbSchema];
		
		assert.strictEqual(User.name, 'User');
		
        assert.strictEqual(dbTable, 'tmp_users');
        assert.strictEqual('id' in dbSchema, true);
		assert.strictEqual('createdOn' in dbSchema, true);
		assert.strictEqual('updatedOn' in dbSchema, true);
		assert.strictEqual('username' in dbSchema, true);
		assert.strictEqual('status' in dbSchema, false);
    });
	
	it('Token model should be defined correctly', function () {
		var dbTable = Token[symbols.dbTable];
		var dbSchema = Token[symbols.dbSchema];
		
		assert.strictEqual(Token.name, 'Token');
		
        assert.strictEqual(dbTable, 'tmp_tokens');
        assert.strictEqual('id' in dbSchema, true);
		assert.strictEqual('createdOn' in dbSchema, true);
		assert.strictEqual('updatedOn' in dbSchema, true);
		assert.strictEqual('username' in dbSchema, false);
		assert.strictEqual('status' in dbSchema, true);
    });
});