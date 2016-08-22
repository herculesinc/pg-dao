// IMPORTS
// ================================================================================================
import { expect } from 'chai';

import { symbols } from './../lib/AbstractModel';
import { DbSchema} from './../lib/schema';
import { User, Token, initConst } from './setup';

let dbSchema: DbSchema;

describe('Models;', () => {
    describe('Models: Definition;', () => {
        describe('User model should be defined correctly', () => {
            beforeEach(() => {
                dbSchema = User[symbols.dbSchema];
            });

            it('name of User model should be defined correctly', () => {
                expect(User.name).to.be.equal('User');
            });

            it('table name should be defined correctly', () => {
                expect(dbSchema.table).to.be.equal(initConst.userTableName);
            });

            it('table should have 4 defined fields', () => {
                expect(dbSchema.hasField('username')).to.be.true;
                expect(dbSchema.hasField('password')).to.be.true;
                expect(dbSchema.hasField('profile')).to.be.true;
                expect(dbSchema.hasField('tags')).to.be.true;
            });

            it('table should have 3 default fields', () => {
                expect(dbSchema.hasField('id')).to.be.true;
                expect(dbSchema.hasField('createdOn')).to.be.true;
                expect(dbSchema.hasField('updatedOn')).to.be.true;
            });
        });

        describe('Token model should be defined correctly', () => {
        beforeEach(() => {
            dbSchema = Token[symbols.dbSchema];
        });

        it('name of Token model should be defined correctly', () => {
            expect(Token.name).to.be.equal('Token');
        });

        it('table name should be defined correctly', () => {
            expect(dbSchema.table).to.be.equal(initConst.tokensTableName);
        });

        it('table should have 1 defined field', () => {
            expect(dbSchema.hasField('status')).to.be.true;
        });

        it('table should have 3 default fields', () => {
            expect(dbSchema.hasField('id')).to.be.true;
            expect(dbSchema.hasField('createdOn')).to.be.true;
            expect(dbSchema.hasField('updatedOn')).to.be.true;
        });
    });
    });
});
