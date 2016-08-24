// IMPORTS
// ================================================================================================
import { expect } from 'chai';

import { areObjectsEqual, areSetsEqual, cloneObject } from './../lib/util';
import { ModelError } from './../lib/errors';

let date1: any, date2: any, date3: any;
let obj1: any, obj2: any, obj3: any, obj4: any;
let clone: any;

describe('Utils;', () => {
    describe('Util: Comparators;', () => {
        describe('Util: areObjectsEqual comparator;', () => {
            describe('Comparing primitives should work correctly', () => {
                it('number === number', () => {
                    expect(areObjectsEqual(1, 1)).to.be.true;
                });

                it('string === string', () => {
                    expect(areObjectsEqual('test', 'test')).to.be.true;
                });

                it('true === true', () => {
                    expect(areObjectsEqual(true, true)).to.be.true;
                });

                it('false === false', () => {
                    expect(areObjectsEqual(false, false)).to.be.true;
                });

                it('undefined === undefined', () => {
                    expect(areObjectsEqual(undefined, undefined)).to.be.true;
                });

                it('null === null', () => {
                    expect(areObjectsEqual(null, null)).to.be.true;
                });

                it('null === undefined', () => {
                    expect(areObjectsEqual(undefined, null)).to.be.true;
                });

                it('number !== string', () => {
                    expect(areObjectsEqual(1, '1')).to.be.false;
                });

                it('string !== boolean', () => {
                    expect(areObjectsEqual('true', true)).to.be.false;
                });

                it('number !== number', () => {
                    expect(areObjectsEqual(1, 2)).to.be.false;
                });

                it('true !== false', () => {
                    expect(areObjectsEqual(true, false)).to.be.false;
                });

                it('false !== undefined', () => {
                    expect(areObjectsEqual(false, undefined)).to.be.false;
                });

                it('false !== null', () => {
                    expect(areObjectsEqual(false, null)).to.be.false;
                });

                it('0 !== null', () => {
                    expect(areObjectsEqual(0, null)).to.be.false;
                });

                it('0 !== undefined', () => {
                    expect(areObjectsEqual(0, undefined)).to.be.false;
                });

                it('empty string !== false', () => {
                    expect(areObjectsEqual('', false)).to.be.false;
                });

                it('empty string !== null', () => {
                    expect(areObjectsEqual('', null)).to.be.false;
                });

                it('empty string !== undefined', () => {
                    expect(areObjectsEqual('', undefined)).to.be.false;
                });
            });

            describe('Comparing dates should work correctly', () => {
                beforeEach(() => {
                    date1 = new Date();
                    date2 = new Date(date1.valueOf());
                    date3 = new Date(date1.valueOf() + 1);
                });

                it('date1 === date1', () => {
                    expect(areObjectsEqual(date1, date1)).to.be.true;
                });

                it('date1 === date2', () => {
                    expect(areObjectsEqual(date1, date2)).to.be.true;
                    expect(areObjectsEqual(date2, date1)).to.be.true;
                });

                it('date1 !== date3', () => {
                    expect(areObjectsEqual(date1, date3)).to.be.false;
                    expect(areObjectsEqual(date3, date1)).to.be.false;
                });

                it('date2 !== date3', () => {
                    expect(areObjectsEqual(date2, date3)).to.be.false;
                    expect(areObjectsEqual(date3, date2)).to.be.false;
                });
            });

            describe('Comparing simple objects should work correctly', () => {
                beforeEach(() => {
                    obj1 = {
                        a: 'a',
                        b: 1,
                        c: true,
                        d: undefined
                    };
                    obj2 = {
                        a: 'a',
                        b: 1,
                        c: true,
                        d: null
                    };
                    obj3 = {
                        a: 'b',
                        b: 2,
                        c: true,
                        d: undefined
                    };
                    obj4 = {
                        a: 'a',
                        b: 1,
                        c: true,
                        e: undefined
                    };
                });

                it('obj1 === obj1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('obj1 === obj2', () => {
                    expect(areObjectsEqual(obj1, obj2)).to.be.true;
                    expect(areObjectsEqual(obj2, obj1)).to.be.true;
                });

                it('obj1 !== obj3', () => {
                    expect(areObjectsEqual(obj1, obj3)).to.be.false;
                    expect(areObjectsEqual(obj3, obj1)).to.be.false;
                });

                it('obj1 !== obj4', () => {
                    expect(areObjectsEqual(obj1, obj4)).to.be.false;
                    expect(areObjectsEqual(obj4, obj1)).to.be.false;
                });
            });

            describe('Comparing nested objects should work correctly', () => {
                beforeEach(() => {
                    obj1 = {
                        a: 'a',
                        b: 1,
                        c: { d: undefined }
                    };
                    obj2 = {
                        a: 'a',
                        b: 1,
                        c: { d: null }
                    };
                    obj3 = {
                        a: 'a',
                        b: 1,
                        c: { d: 0 }
                    };
                    obj4 = {
                        a: 'b',
                        b: 1,
                        c: { e: undefined }
                    };
                });

                it('obj1 === obj1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('obj1 === obj2', () => {
                    expect(areObjectsEqual(obj1, obj2)).to.be.true;
                    expect(areObjectsEqual(obj2, obj1)).to.be.true;
                });

                it('obj1 !== obj3', () => {
                    expect(areObjectsEqual(obj1, obj3)).to.be.false;
                    expect(areObjectsEqual(obj3, obj1)).to.be.false;
                });

                it('obj1 !== obj4', () => {
                    expect(areObjectsEqual(obj1, obj4)).to.be.false;
                    expect(areObjectsEqual(obj4, obj1)).to.be.false;
                });
            });

            describe('Comparing simple arrays should work correctly', () => {
                beforeEach(() => {
                    obj1 = [1, 2, 3];
                    obj2 = [1, 2, 3];
                    obj3 = [1, 3, 4];
                    obj4 = [2, 3, 1];
                });

                it('arr1 === arr1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('arr1 === arr2', () => {
                    expect(areObjectsEqual(obj1, obj2)).to.be.true;
                    expect(areObjectsEqual(obj2, obj1)).to.be.true;
                });

                it('arr1 !== arr3', () => {
                    expect(areObjectsEqual(obj1, obj3)).to.be.false;
                    expect(areObjectsEqual(obj3, obj1)).to.be.false;
                });

                it('arr1 !== arr4', () => {
                    expect(areObjectsEqual(obj1, obj4)).to.be.false;
                    expect(areObjectsEqual(obj4, obj1)).to.be.false;
                });
            });

            describe('Comparing arrays with objects should work correctly', () => {
                beforeEach(() => {
                    obj1 = [1, {
                        a: 'a',
                        b: { c: 'c' }
                    }, 3];
                    obj2 = [1, {
                        a: 'a',
                        b: { c: 'c' }
                    }, 3];
                    obj3 = [1, {
                        a: 'a',
                        d: { c: 'c' }
                    }, 4];
                    obj4 = [2, {
                        a: 'a',
                        b: { c: 'c' }
                    }, 1];
                });

                it('obj1 === obj1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('obj1 === obj2', () => {
                    expect(areObjectsEqual(obj1, obj2)).to.be.true;
                    expect(areObjectsEqual(obj2, obj1)).to.be.true;
                });

                it('obj1 !== obj3', () => {
                    expect(areObjectsEqual(obj1, obj3)).to.be.false;
                    expect(areObjectsEqual(obj3, obj1)).to.be.false;
                });

                it('obj1 !== obj4', () => {
                    expect(areObjectsEqual(obj1, obj4)).to.be.false;
                    expect(areObjectsEqual(obj4, obj1)).to.be.false;
                });
            });

            describe('Comparing complex objects should work correctly', () => {
                beforeEach(() => {
                    obj1 = {
                        a: 'a',
                        b: ['a', 'b', 'c'],
                        c: {
                            d: 'd',
                            e: 3,
                            f: true,
                            g: [1, 2, 3]
                        },
                        d: [{ a: 'a' }, { a: 'b' }, { a: 'c' }]
                    };

                    obj2 = {
                        a: 'a',
                        b: ['a', 'b', 'c'],
                        c: {
                            d: 'd',
                            e: 3,
                            f: true,
                            g: [1, 2, 3]
                        },
                        d: [{ a: 'a' }, { a: 'b' }, { a: 'c' }]
                    };

                    obj3 = {
                        a: 'a',
                        b: ['a', 'b', 'c', 'd'],
                        c: {
                            d: 'd',
                            e: 3,
                            f: true,
                            g: [1, 2, 3]
                        },
                        d: [{ a: 'a' }, { a: 'b' }, { a: 'c' }]
                    };
                });

                it('obj1 === obj1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('obj1 === obj2', () => {
                    expect(areObjectsEqual(obj1, obj2)).to.be.true;
                    expect(areObjectsEqual(obj2, obj1)).to.be.true;
                });

                it('obj1 !== obj3', () => {
                    expect(areObjectsEqual(obj1, obj3)).to.be.false;
                    expect(areObjectsEqual(obj3, obj1)).to.be.false;
                });
            });

            describe('Functions should be ignored during comparision', () => {
                beforeEach(() => {
                    let timestamp = Date.now();

                    obj1 = {
                        a: 'a',
                        b: new Date(timestamp),
                        foo() {
                            return 'a';
                        }
                    };

                    obj2 = {
                        a: 'a',
                        b: new Date(timestamp),
                        bar() {
                            return 'b';
                        }
                    };
                });

                it('obj1 === obj1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('obj1 === obj2', () => {
                    expect(areObjectsEqual(obj1, obj2)).to.be.true;
                    expect(areObjectsEqual(obj2, obj1)).to.be.true;
                });
            });

            describe('isEqualTo() should be used when present', () => {
                beforeEach(() => {
                    let timestamp = Date.now();

                    obj1 = {
                        a1: 'a',
                        b : new Date(timestamp),
                        isEqualTo() {
                            return true;
                        }
                    };

                    obj2 = {
                        a2: 'b',
                        b : new Date(timestamp),
                        isEqualTo() {
                            return true;
                        }
                    };

                    obj3 = {
                        a2: 'a',
                        b : new Date(timestamp),
                        isEqualTo() {
                            return false;
                        }
                    };
                });

                it('obj1 === obj1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('obj1 === obj2', () => {
                    expect(areObjectsEqual(obj1, obj2)).to.be.true;
                    expect(areObjectsEqual(obj2, obj1)).to.be.true;
                });

                it('obj1 === obj3', () => {
                    expect(areObjectsEqual(obj1, obj3)).to.be.true;
                });

                it('obj3 === obj1', () => {
                    expect(areObjectsEqual(obj3, obj1)).to.be.false;
                });
            });

            describe('Circular references should throw an error', () => {
                beforeEach(() => {
                    obj1 = {
                        a: 'a',
                        c: undefined
                    };

                    obj1.c = obj1;

                    obj2 = {
                        a: 'a',
                        c: undefined
                    };

                    obj2.c = obj2;
                });

                it('should not throw an error if try to compare obj1 and obj1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('should not throw an error if try to compare obj2 and obj2', () => {
                    expect(areObjectsEqual(obj2, obj2)).to.be.true;
                });

                it('should throw an error if try to compare obj1 and obj2', done => {
                    try {
                        areObjectsEqual(obj1, obj2);
                        done('should throw an error');
                    } catch (error) {
                        expect(error).to.be.instanceof(ModelError);
                        done();
                    }
                });

                it('should throw an error if try to compare obj2 and obj1', done => {
                    try {
                        areObjectsEqual(obj2, obj1);
                        done('should throw an error');
                    } catch (error) {
                        expect(error).to.be.instanceof(ModelError);
                        done();
                    }
                });
            });

            describe('Cross-object circular references should throw an error', () => {
                beforeEach(() => {
                    obj1 = {
                        a: 'a',
                        c: undefined
                    };

                    obj2 = {
                        a: 'a',
                        c: undefined
                    };

                    obj1.c = obj2;
                    obj2.c = obj1;
                });

                it('should not throw an error if try to compare obj1 and obj1', () => {
                    expect(areObjectsEqual(obj1, obj1)).to.be.true;
                });

                it('should not throw an error if try to compare obj2 and obj2', () => {
                    expect(areObjectsEqual(obj2, obj2)).to.be.true;
                });

                it('should throw an error if try to compare obj1 and obj2', done => {
                    try {
                        areObjectsEqual(obj1, obj2);
                        done('should throw an error');
                    } catch (error) {
                        expect(error).to.be.instanceof(ModelError);
                        done();
                    }
                });

                it('should throw an error if try to compare obj2 and obj1', done => {
                    try {
                        areObjectsEqual(obj2, obj1);
                        done('should throw an error');
                    } catch (error) {
                        expect(error).to.be.instanceof(ModelError);
                        done();
                    }
                });
            });
        });

        describe('Util: areObjectsEqual comparator;', () => {
            describe('Comparing simple arrays as sets should work correctly', () => {
                beforeEach(() => {
                    obj1 = [1, 2, 3];
                    obj2 = [1, 2, 3];
                    obj3 = [1, 3, 4];
                    obj4 = [2, 3, 1];
                });

                it('arr1 === arr1', () => {
                    expect(areSetsEqual(obj1, obj1)).to.be.true;
                });

                it('arr1 === arr2', () => {
                    expect(areSetsEqual(obj1, obj2)).to.be.true;
                    expect(areSetsEqual(obj2, obj1)).to.be.true;
                });

                it('arr1 !== arr3', () => {
                    expect(areSetsEqual(obj1, obj3)).to.be.false;
                    expect(areSetsEqual(obj3, obj1)).to.be.false;
                });

                it('arr1 === arr4', () => {
                    expect(areSetsEqual(obj1, obj4)).to.be.true;
                    expect(areSetsEqual(obj4, obj1)).to.be.true;
                });
            });

            describe('Comparing arrays with objects as sets should work correctly', () => {
                beforeEach(() => {
                    obj1 = [1, {
                        a: 'a',
                        b: { c: 'c' }
                    }, 3];
                    obj2 = [1, {
                        a: 'a',
                        b: { c: 'c' }
                    }, 3];
                    obj3 = [1, {
                        a: 'a',
                        d: { c: 'c' }
                    }, 4];
                    obj4 = [2, {
                        a: 'a',
                        b: { c: 'c' }
                    }, 1];
                });

                it('arr1 === arr1', () => {
                    expect(areSetsEqual(obj1, obj1)).to.be.true;
                });

                it('arr1 === arr2', () => {
                    expect(areSetsEqual(obj1, obj2)).to.be.true;
                    expect(areSetsEqual(obj2, obj1)).to.be.true;
                });

                it('arr1 !== arr3', () => {
                    expect(areSetsEqual(obj1, obj3)).to.be.false;
                    expect(areSetsEqual(obj3, obj1)).to.be.false;
                });

                it('arr1 !== arr4', () => {
                    expect(areSetsEqual(obj1, obj4)).to.be.false;
                    expect(areSetsEqual(obj4, obj1)).to.be.false;
                });
            });
        });
    });

    describe('Util: Cloners;', function () {
        describe('Util: cloneObject cloner;', () => {
            describe('Cloning primitives should return the same value;', () => {
                it('should clone number', () => {
                    expect(cloneObject(1)).to.equal(1);
                });

                it('should clone string', () => {
                    expect(cloneObject('test')).to.equal('test');
                });

                it('should clone empty string', () => {
                    expect(cloneObject('')).to.equal('');
                });

                it('should clone boolean', () => {
                    expect(cloneObject(true)).to.be.true;
                    expect(cloneObject(false)).to.be.false;
                });

                it('should clone null and return undefined', () => {
                    expect(cloneObject(null)).to.be.undefined;
                });

                it('should clone undefined and return undefined', () => {
                    expect(cloneObject(undefined)).to.be.undefined;
                });
            });

            describe('Cloning date should return the same date;', () => {
                beforeEach(() => {
                    date1 = new Date();
                    clone = cloneObject(date1);
                });

                it('clone and date should be equal', () => {
                    expect(clone).to.equal(date1);
                });

                it('values for clone and date should be equal', () => {
                    expect(cloneObject(date1).valueOf()).to.equal(date1.valueOf());
                });
            });

            describe('Cloning simple objects should return identical object;', () => {
                beforeEach(() => {
                    obj1 = {
                        a: 'a',
                        b: 1,
                        c: true,
                        d: undefined
                    };

                    clone = cloneObject(obj1);
                });

                it('clone and object should not be equal', () => {
                    expect(clone).to.not.equal(obj1);
                });

                it('clone and object should be deep equal', () => {
                    expect(clone).to.deep.equal(obj1);
                });
            });

            describe('Cloning arrays of primitives should return identical arrays;', () => {
                beforeEach(() => {
                    obj1 = [1, 2, 3];
                    clone = cloneObject(obj1);
                });

                it('clone and array should not be equal', () => {
                    expect(clone).to.not.equal(obj1);
                });

                it('clone and array should be deep equal', () => {
                    expect(clone).to.deep.equal(obj1);
                });
            });

            describe('Cloning complex objects should return identical object;', () => {
                beforeEach(() => {
                    obj1 = {
                        a: 'a',
                        b: 1,
                        c: [1, 2, 3],
                        d: {
                            e: 'e',
                            f: [{
                                a: 'a',
                                b: 'b',
                                c: 'c'
                            }, {
                                a: 'a1',
                                b: 'b1'
                            }]
                        },
                        g: new Date()
                    };
                    clone = cloneObject(obj1);
                });

                it('clone and object should not be equal', () => {
                    expect(clone).to.not.equal(obj1);
                });

                it('clone and object should be deep equal', () => {
                    expect(clone).to.deep.equal(obj1);
                });
            });

            describe('Circular references should throw an error', () => {
                beforeEach(() => {
                    obj1 = {
                        a: 'a',
                        c: undefined
                    };
                    obj1.c = obj1;
                });

                it('should throw an error if try to compare obj1 and obj2', done => {
                    try {
                        clone = cloneObject(obj1);
                        done('should throw an error');
                    } catch (error) {
                        expect(error).to.be.instanceof(ModelError);
                        done();
                    }
                });
            });
        });
    });
});
