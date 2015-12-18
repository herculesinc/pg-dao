// IMPORTS
// ================================================================================================
import * as assert from 'assert';

import { symbols } from './../lib/AbstractModel';
import { User, Token } from './setup';
import { ModelError } from './../lib/errors';
import { deepClone, deepCompare, compareArraysStrict, compareArraysAsSets } from './../lib/util';

// MODEL DEFINITION
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

// COMPARATORS
// ================================================================================================
describe('Util: Comparators', function () {
        
    it('Comparing primitives should work correctly', function () {
		
        assert.strictEqual(deepCompare(1, 1, compareArraysStrict), 					true, 'number=number');
        assert.strictEqual(deepCompare('test', 'test', compareArraysStrict), 		true, 'string=string');
		assert.strictEqual(deepCompare(true, true, compareArraysStrict), 			true, 'boolean=boolean');
		assert.strictEqual(deepCompare(undefined, undefined, compareArraysStrict), 	true, 'undefined=undefined');
		assert.strictEqual(deepCompare(undefined, null, compareArraysStrict), 		true, 'null=undefined');
		
		assert.strictEqual(deepCompare(1, '1', compareArraysStrict), 				false, 'number!=string');
		assert.strictEqual(deepCompare('true', true, compareArraysStrict), 			false, 'string!=boolean');
		assert.strictEqual(deepCompare(1, 2, compareArraysStrict), 					false, 'number!=number');
		assert.strictEqual(deepCompare(true, false, compareArraysStrict), 			false, 'boolean!=boolean');
		assert.strictEqual(deepCompare(false, undefined, compareArraysStrict), 		false, 'false!=undefined');
		assert.strictEqual(deepCompare(false, null, compareArraysStrict), 			false, 'false!=null');
		assert.strictEqual(deepCompare(0, undefined, compareArraysStrict), 			false, '0!=undefined');
		assert.strictEqual(deepCompare(0, null, compareArraysStrict), 				false, '0!=null');
		assert.strictEqual(deepCompare('', false, compareArraysStrict), 			false, 'empty stirng!=false');
		assert.strictEqual(deepCompare('', null, compareArraysStrict), 				false, 'empty stirng!=null');
		assert.strictEqual(deepCompare('', undefined, compareArraysStrict), 		false, 'empty stirng!=undefined');
    });
	
	it('Comparing dates should work correctly', function () {
		
		var date1 = new Date();
		var date2 = new Date(date1.valueOf());
		var date3 = new Date(date1.valueOf() + 1);
		
        assert.strictEqual(deepCompare(date1, date1, compareArraysStrict), 		true);
        assert.strictEqual(deepCompare(date1, date2, compareArraysStrict), 		true);
		
		assert.strictEqual(deepCompare(date1, date3, compareArraysStrict), 		false);
		assert.strictEqual(deepCompare(date2, date3, compareArraysStrict), 		false);
    });
	
	it('Comparing simple objects should work correctly', function () {
		
		var obj1 = { a: 'a', b: 1, c: true, d: undefined };
		var obj2 = { a: 'a', b: 1, c: true, d: undefined };
		var obj3 = { a: 'b', b: 2, c: true, d: undefined };
		var obj4 = { a: 'a', b: 1, c: true, e: undefined };
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysStrict), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysStrict), 		true);
		
		assert.strictEqual(deepCompare(obj1, obj3, compareArraysStrict), 		false);
		assert.strictEqual(deepCompare(obj1, obj4, compareArraysStrict), 		false);
    });
	
	it('Comparing nested objects should work correctly', function () {
		
		var obj1 = { a: 'a', b: { c: 'c' } };
		var obj2 = { a: 'a', b: { c: 'c' } };
		var obj3 = { a: 'b', b: { c: 'd' } };
		var obj4 = { a: 'b', b: { d: 'c' } };
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysStrict), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysStrict), 		true);
		
		assert.strictEqual(deepCompare(obj1, obj3, compareArraysStrict), 		false);
		assert.strictEqual(deepCompare(obj1, obj4, compareArraysStrict), 		false);
    });
	
	it('Comparing simple arrays should work correctly', function () {
		
		var obj1 = [1, 2, 3];
		var obj2 = [1, 2, 3];
		var obj3 = [1, 3, 4];
		var obj4 = [2, 3, 1];
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysStrict), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysStrict), 		true);
		
		assert.strictEqual(deepCompare(obj1, obj3, compareArraysStrict), 		false);
		assert.strictEqual(deepCompare(obj1, obj4, compareArraysStrict), 		false);
    });
	
	it('Comparing arrays with objects should work correctly', function () {
		
		var obj1 = [1, { a: 'a', b: { c: 'c' } }, 3];
		var obj2 = [1, { a: 'a', b: { c: 'c' } }, 3];
		var obj3 = [1, { a: 'a', d: { c: 'c' } }, 4];
		var obj4 = [2, { a: 'a', b: { c: 'c' } }, 1];
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysStrict), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysStrict), 		true);
		
		assert.strictEqual(deepCompare(obj1, obj3, compareArraysStrict), 		false);
		assert.strictEqual(deepCompare(obj1, obj4, compareArraysStrict), 		false);
    });
	
	it('Comparing simple arrays as sets should work correctly', function () {
		
		var obj1 = [1, 2, 3];
		var obj2 = [1, 2, 3];
		var obj3 = [1, 3, 4];
		var obj4 = [2, 3, 1];
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysAsSets), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysAsSets), 		true);
		
		assert.strictEqual(deepCompare(obj1, obj3, compareArraysAsSets), 		false);
		assert.strictEqual(deepCompare(obj1, obj4, compareArraysAsSets), 		true);
    });
	
	it('Comparing arrays with objects as sets should work correctly', function () {
		
		var obj1 = [1, { a: 'a', b: { c: 'c' } }, 3];
		var obj2 = [1, { a: 'a', b: { c: 'c' } }, 3];
		var obj3 = [1, { a: 'a', d: { c: 'c' } }, 4];
		var obj4 = [2, { a: 'a', b: { c: 'c' } }, 1];
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysAsSets), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysAsSets), 		true);
		
		assert.strictEqual(deepCompare(obj1, obj3, compareArraysAsSets), 		false);
		assert.strictEqual(deepCompare(obj1, obj4, compareArraysAsSets), 		false);
    });
	
	it('Comparing complex objects should work correctly', function () {
		
		var obj1 = {
			a: 'a',
			b: [ 'a', 'b', 'c'],
			c: {
				d: 'd',
				e: 3,
				f: true,
				g: [ 1, 2, 3 ]
			},
			d: [{ a: 'a' }, { a: 'b' }, { a: 'c' }]
		};
		
		var obj2 = {
			a: 'a',
			b: [ 'a', 'b', 'c' ],
			c: {
				d: 'd',
				e: 3,
				f: true,
				g: [ 1, 2, 3 ]
			},
			d: [ { a: 'a' }, { a: 'b' }, { a: 'c' } ]
		};
		
		var obj3 = {
			a: 'a',
			b: [ 'a', 'b', 'c', 'd' ],
			c: {
				d: 'd',
				e: 3,
				f: true,
				g: [ 1, 2, 3 ]
			},
			d: [ { a: 'a' }, { a: 'b' }, { a: 'c' }	]
		};
		
		var obj4 = {
			b: [ 'b', 'c', 'a' ],
			a: 'a',
			c: {
				e: 3,
				d: 'd',
				f: true,
				g: [ 2, 3, 1 ]
			},
			d: [ { a: 'b' }, { a: 'a' }, { a: 'c' } ]
		};
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysAsSets), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysAsSets), 		true);
		
		assert.strictEqual(deepCompare(obj1, obj3, compareArraysAsSets), 		false);
		assert.strictEqual(deepCompare(obj1, obj4, compareArraysAsSets), 		true);
    });
	
	it('Funcitons should be ignorred during comparision', function () {
		
		var timestamp = Date.now();
		var obj1 = {
			a: 'a',
			b: new Date(timestamp),
			foo() {
				return 'a';
			}
		};
		
		var obj2 = {
			a: 'a',
			b: new Date(timestamp),
			bar() {
				return 'a';
			}
		};
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysAsSets), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysAsSets), 		true);
    });
	
	it('isEqualTo() should be used when present', function () {
		
		var timestamp = Date.now();
		var obj1 = {
			a1: 'a',
			b: new Date(timestamp),
			isEqualTo(value: any) {
				return true;
			}
		};
		
		var obj2 = {
			a2: 'b',
			b: new Date(timestamp),
			isEqualTo(value: any) {
				return true;
			}
		};
		
        assert.strictEqual(deepCompare(obj1, obj1, compareArraysAsSets), 		true);
        assert.strictEqual(deepCompare(obj1, obj2, compareArraysAsSets), 		true);
    });
	
	it('Circular references should throw an error', function () {
		
		var timestamp = Date.now();
		var obj1 = {
			a: 'a',
			c: undefined
		};
		obj1.c = obj1;
		
		var obj2 = {
			a: 'a',
			c: undefined
		};
		obj2.c = obj2;
		
		assert.throws(() => {
			deepCompare(obj1, obj2, compareArraysAsSets)
		}, ModelError);
    });
	
	it('Cross-object circular references should throw an error', function () {
		
		var timestamp = Date.now();
		var obj1 = {
			a: 'a',
			c: undefined
		};
		
		var obj2 = {
			a: 'a',
			c: undefined
		};
		
		obj1.c = obj2;
		obj2.c = obj1;
		
		assert.throws(() => {
			deepCompare(obj1, obj2, compareArraysAsSets)
		}, ModelError);
    });
});

// CLONERS
// ================================================================================================
describe('Util: Cloners', function () {
        
    it('Cloning primitives should return the same value', function () {
        assert.strictEqual(deepClone(1), 1);
        assert.strictEqual(deepClone('test'), 'test');
		assert.strictEqual(deepClone(true), true);
		assert.strictEqual(deepClone(null), undefined);
		assert.strictEqual(deepClone(undefined), undefined);
    });
	
	it('Cloning date should return the same date', function () {
		var date = new Date();
        assert.strictEqual(deepClone(date).valueOf(), date.valueOf());
    });
	
	it('Cloning simple objects should return identical object', function () {
		var object = { a: 'a', b: 1, c: true, d: undefined };
        var clone = deepClone(object);
		
		assert.notStrictEqual(clone, object);
		assert.deepEqual(clone, object);
    });
	
	it('Cloning arrays of primitives should return identical arrays', function () {
		var array = [1, 2, 3];
        var clone = deepClone(array);
		
		assert.notStrictEqual(clone, array);
		assert.deepEqual(clone, array);
    });
	
	it('Cloning complex objects should return identitical object', function () {
		var object = { 
			a: 'a', 
			b: 1, 
			c: [ 1, 2 , 3],
			d: {
				e: 'e',
				f: [ { a: 'a', b: 'b', c: 'c' }, { a: 'a1', b: 'b1'}]
			},
			g: new Date()
		};
		
        var clone = deepClone(object);
		assert.notStrictEqual(clone, object);
		assert.deepEqual(clone, object);
    });
	
	it('Circular references should throw an error', function () {
		
		var timestamp = Date.now();
		var object = {
			a: 'a',
			c: undefined
		};
		object.c = object;
		
		assert.throws(() => {
			var clone = deepClone(object);
		}, ModelError);
    });
});