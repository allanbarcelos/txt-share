'use strict';
// socket.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');

const { validateId, validateTxt, isRateLimited, socketRateLimits } = require('../socket');
const { cache, txtDBPrefixKey, setTxt, getTxtById, deleteTxt } = require('../cache');

// ── Helpers ───────────────────────────────────────────────────────────────────

function futureValidUntil(msFromNow = 3600000) {
    return new Date(Date.now() + msFromNow).toISOString();
}

function clearCache() {
    const keys = cache.keys().filter(k => k.startsWith(txtDBPrefixKey));
    keys.forEach(k => cache.del(k));
}

// ── validateId ────────────────────────────────────────────────────────────────

describe('validateId', () => {
    test('accepts s_[a-z0-9]{7} format', () => {
        assert.strictEqual(validateId('s_abc1234'), true);
        assert.strictEqual(validateId('s_0000000'), true);
        assert.strictEqual(validateId('s_zzzzzzz'), true);
        assert.strictEqual(validateId('s_a1b2c3d'), true);
    });

    test('rejects id with uppercase letters', () => {
        assert.strictEqual(validateId('s_ABC1234'), false);
    });

    test('rejects id shorter than expected', () => {
        assert.strictEqual(validateId('s_abc123'), false);
    });

    test('rejects id longer than expected', () => {
        assert.strictEqual(validateId('s_abc12345'), false);
    });

    test('rejects id without s_ prefix', () => {
        assert.strictEqual(validateId('abc1234'), false);
    });

    test('rejects empty string', () => {
        assert.strictEqual(validateId(''), false);
    });

    test('rejects non-string values', () => {
        assert.strictEqual(validateId(null), false);
        assert.strictEqual(validateId(undefined), false);
        assert.strictEqual(validateId(123), false);
        assert.strictEqual(validateId({}), false);
    });

    test('rejects id with special characters', () => {
        assert.strictEqual(validateId('s_abc!23'), false);
        assert.strictEqual(validateId('s_abc 234'), false);
    });
});

// ── validateTxt ───────────────────────────────────────────────────────────────

describe('validateTxt', () => {
    test('accepts empty string', () => {
        assert.strictEqual(validateTxt(''), true);
    });

    test('accepts regular string', () => {
        assert.strictEqual(validateTxt('hello world'), true);
    });

    test('accepts string with newlines and tabs', () => {
        assert.strictEqual(validateTxt('line1\nline2\ttabbed'), true);
    });

    test('rejects null bytes', () => {
        assert.strictEqual(validateTxt('hello\x00world'), false);
        assert.strictEqual(validateTxt('\x00'), false);
    });

    test('rejects non-string values', () => {
        assert.strictEqual(validateTxt(null), false);
        assert.strictEqual(validateTxt(undefined), false);
        assert.strictEqual(validateTxt(123), false);
        assert.strictEqual(validateTxt([]), false);
        assert.strictEqual(validateTxt({}), false);
    });
});

// ── isRateLimited ─────────────────────────────────────────────────────────────

describe('isRateLimited', () => {
    beforeEach(() => {
        socketRateLimits.clear();
    });

    test('allows requests up to the limit', () => {
        for (let i = 0; i < 5; i++) {
            assert.strictEqual(isRateLimited('sock1', 'test', 5, 60000), false,
                `Should not be rate limited on call ${i + 1}`);
        }
    });

    test('blocks after exceeding the limit', () => {
        for (let i = 0; i < 5; i++) isRateLimited('sock2', 'test', 5, 60000);
        assert.strictEqual(isRateLimited('sock2', 'test', 5, 60000), true);
    });

    test('resets after window expires', () => {
        // Use a 1ms window so it expires immediately
        for (let i = 0; i < 3; i++) isRateLimited('sock3', 'test', 3, 1);
        assert.strictEqual(isRateLimited('sock3', 'test', 3, 1), true);

        // Wait for the window to expire
        const start = Date.now();
        while (Date.now() - start < 5) { /* spin */ }

        assert.strictEqual(isRateLimited('sock3', 'test', 3, 1), false);
    });

    test('tracks different events independently', () => {
        for (let i = 0; i < 3; i++) isRateLimited('sock4', 'eventA', 3, 60000);
        assert.strictEqual(isRateLimited('sock4', 'eventA', 3, 60000), true);
        assert.strictEqual(isRateLimited('sock4', 'eventB', 3, 60000), false);
    });

    test('tracks different sockets independently', () => {
        for (let i = 0; i < 3; i++) isRateLimited('sockA', 'event', 3, 60000);
        assert.strictEqual(isRateLimited('sockA', 'event', 3, 60000), true);
        assert.strictEqual(isRateLimited('sockB', 'event', 3, 60000), false);
    });
});

// ── Socket event handlers (using real cache + mock socket) ────────────────────

// We test the exported handler functions indirectly by importing them
// via a minimal mock io/socket that matches the shape expected.

// Load the internal async handlers through a local re-require trick.
// Since socket.js doesn't export them, we test the observable side-effects
// via the cache + exported pure functions already covered above.
// The integration tests below use the socket event system itself.

describe('startTXT via mock', () => {
    // Create a minimal mock socket + io to call setupSocket
    let mockSocket;
    let mockIo;
    let handlers;
    let emittedEvents;
    let callbackResult;

    const { setupSocket } = require('../socket');

    function makeSocket(id = 'socket-test-id') {
        const eventListeners = {};
        const emitted = [];
        const rooms = new Set();

        return {
            id,
            emitted,
            on(event, handler) { eventListeners[event] = handler; },
            emit(event, data) { emitted.push({ event, data }); },
            join: async (room) => { rooms.set ? rooms.set.call(rooms, room) : rooms.add(room); },
            to() { return { emit() {} }; },
            _trigger(event, data, cb) {
                if (eventListeners[event]) eventListeners[event](data, cb);
            },
        };
    }

    function makeIo(socket) {
        return {
            on(event, handler) {
                if (event === 'connection') handler(socket);
            },
            engine: {
                clientsCount: 1,
                on() {},
            },
        };
    }

    beforeEach(() => {
        clearCache();
        socketRateLimits.clear();
        mockSocket = makeSocket();
        mockIo = makeIo(mockSocket);
        setupSocket(mockIo);
    });

    test('startTXT with existing id emits _startTXT', async () => {
        const item = { id: 's_exist01', validUntil: futureValidUntil(), txt: 'found it' };
        setTxt(item.id, item);

        await new Promise(resolve => {
            mockSocket._trigger('startTXT', { id: item.id }, (res) => {
                callbackResult = res;
                resolve();
            });
        });

        const evt = mockSocket.emitted.find(e => e.event === '_startTXT');
        assert.ok(evt, '_startTXT should be emitted');
        assert.strictEqual(evt.data.id, item.id);
        assert.strictEqual(callbackResult.success, true);
    });

    test('startTXT with invalid id calls callback with error', async () => {
        await new Promise(resolve => {
            mockSocket._trigger('startTXT', { id: 'INVALID' }, (res) => {
                callbackResult = res;
                resolve();
            });
        });

        assert.strictEqual(callbackResult.success, false);
        assert.ok(callbackResult.error);
    });

    test('startTXT with non-existent id emits _txtNotExist', async () => {
        await new Promise(resolve => {
            mockSocket._trigger('startTXT', { id: 's_gone001' }, (res) => {
                callbackResult = res;
                resolve();
            });
        });

        const evt = mockSocket.emitted.find(e => e.event === '_txtNotExist');
        assert.ok(evt, '_txtNotExist should be emitted');
        assert.strictEqual(callbackResult.success, false);
    });

    test('startTXT without id creates new TXT and emits _startTXT', async () => {
        await new Promise(resolve => {
            mockSocket._trigger('startTXT', {}, (res) => {
                callbackResult = res;
                resolve();
            });
        });

        const evt = mockSocket.emitted.find(e => e.event === '_startTXT');
        assert.ok(evt, '_startTXT should be emitted for new item');
        assert.ok(evt.data.id.startsWith('s_'), 'new id should start with s_');
        assert.strictEqual(callbackResult.success, true);
    });

    test('startTXT generates a unique id even when first candidates collide', async () => {
        // Pre-fill the cache with a known id to force one collision
        const collidingId = 's_aaaaaaa';
        setTxt(collidingId, { id: collidingId, validUntil: futureValidUntil(), txt: 'existing' });

        // Patch generateRandomString to return the colliding id once, then a unique one
        const { generateRandomString } = require('../cache');
        let callCount = 0;
        const originalModule = require('../cache');
        const origFn = originalModule.generateRandomString;
        originalModule.generateRandomString = () => {
            callCount++;
            return callCount === 1 ? 'aaaaaaa' : origFn(7);
        };

        let cbResult;
        await new Promise(resolve => {
            mockSocket._trigger('startTXT', {}, (res) => { cbResult = res; resolve(); });
        });

        originalModule.generateRandomString = origFn; // restore

        assert.strictEqual(cbResult.success, true);
        const evt = mockSocket.emitted.find(e => e.event === '_startTXT');
        assert.ok(evt, '_startTXT should be emitted');
        assert.notStrictEqual(evt.data.id, collidingId, 'should not overwrite the colliding entry');
    });
});

describe('updateTXT via mock', () => {
    let mockSocket;
    let mockIo;
    const { setupSocket } = require('../socket');

    function makeSocket(id = 'socket-upd-id') {
        const eventListeners = {};
        const emitted = [];
        return {
            id,
            emitted,
            on(event, handler) { eventListeners[event] = handler; },
            emit(event, data) { emitted.push({ event, data }); },
            to() { return { emit() {} }; },
            _trigger(event, data, cb) {
                if (eventListeners[event]) eventListeners[event](data, cb);
            },
        };
    }

    function makeIo(socket) {
        return {
            on(event, handler) { if (event === 'connection') handler(socket); },
            engine: { clientsCount: 1, on() {} },
        };
    }

    beforeEach(() => {
        clearCache();
        socketRateLimits.clear();
        mockSocket = makeSocket();
        mockIo = makeIo(mockSocket);
        setupSocket(mockIo);
    });

    test('updateTXT with null byte in txt returns error', async () => {
        const item = { id: 's_upd0001', validUntil: futureValidUntil(), txt: 'original' };
        setTxt(item.id, item);

        let cbResult;
        await new Promise(resolve => {
            mockSocket._trigger('updateTXT', { id: item.id, txt: 'hello\x00world' }, (res) => {
                cbResult = res;
                resolve();
            });
        });

        assert.strictEqual(cbResult.success, false);
        assert.ok(cbResult.error);
    });

    test('updateTXT exceeding 100KB emits _sizeExceeded', async () => {
        const item = { id: 's_upd0002', validUntil: futureValidUntil(), txt: 'ok' };
        setTxt(item.id, item);

        const bigTxt = 'x'.repeat(101 * 1024);
        let cbResult;
        await new Promise(resolve => {
            mockSocket._trigger('updateTXT', { id: item.id, txt: bigTxt }, (res) => {
                cbResult = res;
                resolve();
            });
        });

        const evt = mockSocket.emitted.find(e => e.event === '_sizeExceeded');
        assert.ok(evt, '_sizeExceeded should be emitted');
        assert.strictEqual(cbResult.success, false);
    });
});

describe('deleteTXT via mock', () => {
    let mockSocket;
    let mockIo;
    const { setupSocket } = require('../socket');

    function makeSocket(id = 'socket-del-id') {
        const eventListeners = {};
        const emitted = [];
        const toEmitted = [];
        return {
            id,
            emitted,
            toEmitted,
            on(event, handler) { eventListeners[event] = handler; },
            emit(event, data) { emitted.push({ event, data }); },
            to() { return { emit(event, data) { toEmitted.push({ event, data }); } }; },
            _trigger(event, data, cb) {
                if (eventListeners[event]) eventListeners[event](data, cb);
            },
        };
    }

    function makeIo(socket) {
        return {
            on(event, handler) { if (event === 'connection') handler(socket); },
            engine: { clientsCount: 1, on() {} },
        };
    }

    beforeEach(() => {
        clearCache();
        socketRateLimits.clear();
        mockSocket = makeSocket();
        mockIo = makeIo(mockSocket);
        setupSocket(mockIo);
    });

    test('deleteTXT removes item from cache', async () => {
        const item = { id: 's_del0001', validUntil: futureValidUntil(), txt: 'to delete' };
        setTxt(item.id, item);
        assert.ok(getTxtById(item.id), 'item should exist before delete');

        let cbResult;
        await new Promise(resolve => {
            mockSocket._trigger('deleteTXT', { id: item.id }, (res) => {
                cbResult = res;
                resolve();
            });
        });

        assert.strictEqual(cbResult.success, true);
        assert.strictEqual(getTxtById(item.id), undefined);
    });

    test('deleteTXT emits _deleteTXT to the requesting socket', async () => {
        const item = { id: 's_del0002', validUntil: futureValidUntil(), txt: 'to delete' };
        setTxt(item.id, item);

        await new Promise(resolve => {
            mockSocket._trigger('deleteTXT', { id: item.id }, resolve);
        });

        const selfEvt = mockSocket.emitted.find(e => e.event === '_deleteTXT');
        assert.ok(selfEvt, '_deleteTXT should be emitted to the requesting socket');
        assert.strictEqual(selfEvt.data.success, true);
    });

    test('deleteTXT on non-existent id returns error', async () => {
        let cbResult;
        await new Promise(resolve => {
            mockSocket._trigger('deleteTXT', { id: 's_nope001' }, (res) => {
                cbResult = res;
                resolve();
            });
        });

        assert.strictEqual(cbResult.success, false);
    });
});

describe('renewTXT via mock', () => {
    let mockSocket;
    let mockIo;
    const { setupSocket } = require('../socket');

    function makeSocket(id = 'socket-ren-id') {
        const eventListeners = {};
        const emitted = [];
        const toEmitted = [];
        return {
            id,
            emitted,
            toEmitted,
            on(event, handler) { eventListeners[event] = handler; },
            emit(event, data) { emitted.push({ event, data }); },
            to() { return { emit(event, data) { toEmitted.push({ event, data }); } }; },
            join: async () => {},
            _trigger(event, data, cb) {
                if (eventListeners[event]) eventListeners[event](data, cb);
            },
        };
    }

    function makeIo(socket) {
        return {
            on(event, handler) { if (event === 'connection') handler(socket); },
            engine: { clientsCount: 1, on() {} },
        };
    }

    beforeEach(() => {
        clearCache();
        socketRateLimits.clear();
        mockSocket = makeSocket();
        mockIo = makeIo(mockSocket);
        setupSocket(mockIo);
    });

    test('renewTXT emits _updateTXT to the requesting socket', async () => {
        const item = { id: 's_ren0001', validUntil: futureValidUntil(1000), txt: 'soon expires' };
        setTxt(item.id, item);

        let cbResult;
        await new Promise(resolve => {
            mockSocket._trigger('renewTXT', { id: item.id }, (res) => {
                cbResult = res;
                resolve();
            });
        });

        assert.strictEqual(cbResult.success, true);
        const selfEvt = mockSocket.emitted.find(e => e.event === '_updateTXT');
        assert.ok(selfEvt, '_updateTXT should be emitted to the requesting socket');
        // validUntil should be ~1h from now
        const newExpiry = new Date(selfEvt.data.validUntil).getTime();
        assert.ok(newExpiry > Date.now() + 3500000, 'validUntil should be ~1h in the future');
    });

    test('renewTXT on non-existent id emits _txtNotExist', async () => {
        let cbResult;
        await new Promise(resolve => {
            mockSocket._trigger('renewTXT', { id: 's_nope001' }, (res) => {
                cbResult = res;
                resolve();
            });
        });

        assert.strictEqual(cbResult.success, false);
        const evt = mockSocket.emitted.find(e => e.event === '_txtNotExist');
        assert.ok(evt, '_txtNotExist should be emitted');
    });
});
