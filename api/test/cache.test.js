'use strict';
// cache.test.js
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');

const {
    cache,
    txtDBPrefixKey,
    getTxtDB,
    getTxtById,
    setTxt,
    deleteTxt,
    generateRandomString,
} = require('../cache');

function clearAll() {
    const keys = cache.keys().filter(k => k.startsWith(txtDBPrefixKey));
    keys.forEach(k => cache.del(k));
}

function futureValidUntil(msFromNow = 3600000) {
    return new Date(Date.now() + msFromNow).toISOString();
}

describe('cache operations', () => {
    beforeEach(() => {
        clearAll();
    });

    // ── setTxt / getTxtById / deleteTxt CRUD ──────────────────────────────────

    describe('CRUD', () => {
        test('setTxt stores item and getTxtById retrieves it', () => {
            const item = { id: 's_crud001', validUntil: futureValidUntil(), txt: 'hello' };
            setTxt(item.id, item);
            const result = getTxtById(item.id);
            assert.deepStrictEqual(result, item);
        });

        test('getTxtById returns undefined for unknown id', () => {
            const result = getTxtById('s_nobody1');
            assert.strictEqual(result, undefined);
        });

        test('deleteTxt removes the item', () => {
            const item = { id: 's_crud002', validUntil: futureValidUntil(), txt: 'bye' };
            setTxt(item.id, item);
            deleteTxt(item.id);
            const result = getTxtById(item.id);
            assert.strictEqual(result, undefined);
        });

        test('deleteTxt returns truthy on success', () => {
            const item = { id: 's_crud003', validUntil: futureValidUntil(), txt: 'del' };
            setTxt(item.id, item);
            const result = deleteTxt(item.id);
            assert.ok(result);
        });

        test('setTxt returns true on success', () => {
            const item = { id: 's_crud004', validUntil: futureValidUntil(), txt: 'ok' };
            const result = setTxt(item.id, item);
            assert.strictEqual(result, true);
        });

        test('overwriting an item with setTxt updates the value', () => {
            const item = { id: 's_crud005', validUntil: futureValidUntil(), txt: 'original' };
            setTxt(item.id, item);
            const updated = { ...item, txt: 'updated' };
            setTxt(item.id, updated);
            const result = getTxtById(item.id);
            assert.strictEqual(result.txt, 'updated');
        });
    });

    // ── getTxtDB ─────────────────────────────────────────────────────────────

    describe('getTxtDB', () => {
        test('returns only items with TXT_ prefix', () => {
            const item = { id: 's_db0001', validUntil: futureValidUntil(), txt: 'a' };
            setTxt(item.id, item);
            // insert a non-TXT_ key directly
            cache.set('OTHER_key', { value: 'unrelated' }, 3600);

            const db = getTxtDB();
            assert.ok(Array.isArray(db));
            assert.ok(db.some(i => i.id === item.id));
            assert.ok(!db.some(i => i && i.value === 'unrelated'));
        });

        test('returns empty array when no TXT_ items exist', () => {
            const db = getTxtDB();
            assert.ok(Array.isArray(db));
            assert.strictEqual(db.length, 0);
        });

        test('returns all stored TXT_ items', () => {
            const a = { id: 's_db0002', validUntil: futureValidUntil(), txt: 'a' };
            const b = { id: 's_db0003', validUntil: futureValidUntil(), txt: 'b' };
            setTxt(a.id, a);
            setTxt(b.id, b);

            const db = getTxtDB();
            assert.strictEqual(db.length, 2);
        });
    });

    // ── generateRandomString ─────────────────────────────────────────────────

    describe('generateRandomString', () => {
        test('returns a string of the requested length', () => {
            const s = generateRandomString(7);
            assert.strictEqual(s.length, 7);
        });

        test('only contains lowercase letters and digits', () => {
            const s = generateRandomString(100);
            assert.match(s, /^[a-z0-9]+$/);
        });

        test('returns different values on successive calls', () => {
            const results = new Set();
            for (let i = 0; i < 20; i++) results.add(generateRandomString(7));
            // With 36^7 ≈ 78B possibilities, 20 calls should be unique
            assert.ok(results.size > 1);
        });

        test('returns empty string for length 0', () => {
            assert.strictEqual(generateRandomString(0), '');
        });
    });

    // ── TTL derived from validUntil ──────────────────────────────────────────

    describe('TTL from validUntil', () => {
        test('setTxt falls back to 3600s when validUntil is undefined', () => {
            const item = { id: 's_nan001', txt: 'no expiry' }; // no validUntil
            setTxt(item.id, item);
            const ttl = cache.getTtl(`${txtDBPrefixKey}${item.id}`);
            const remaining = ttl - Date.now();
            // Should be ~3600s fallback, allow ±5s
            assert.ok(remaining > 3595000 && remaining <= 3605000,
                `Expected fallback TTL ~3600000ms but got ${remaining}ms`);
        });

        test('setTxt falls back to 3600s when validUntil is not a valid date', () => {
            const item = { id: 's_nan002', validUntil: 'not-a-date', txt: 'bad expiry' };
            setTxt(item.id, item);
            const ttl = cache.getTtl(`${txtDBPrefixKey}${item.id}`);
            const remaining = ttl - Date.now();
            assert.ok(remaining > 3595000 && remaining <= 3605000,
                `Expected fallback TTL ~3600000ms but got ${remaining}ms`);
        });

        test('setTxt uses TTL derived from validUntil', () => {
            const validUntil = new Date(Date.now() + 5000).toISOString(); // 5s from now
            const item = { id: 's_ttl001', validUntil, txt: 'ttl test' };
            setTxt(item.id, item);

            // TTL should be close to 5 seconds (node-cache getTtl returns ms epoch)
            const ttl = cache.getTtl(`${txtDBPrefixKey}${item.id}`);
            const remaining = ttl - Date.now();
            // Should be roughly 5000ms, allow ±1000ms for test timing
            assert.ok(remaining > 0 && remaining <= 6000,
                `Expected TTL ~5000ms but got ${remaining}ms`);
        });

        test('item expires after validUntil passes', (_, done) => {
            const validUntil = new Date(Date.now() + 1000).toISOString(); // 1s
            const item = { id: 's_ttl002', validUntil, txt: 'short lived' };
            setTxt(item.id, item);

            // Immediately readable
            assert.ok(getTxtById(item.id));

            // After ~1.5s, should be expired
            setTimeout(() => {
                const result = getTxtById(item.id);
                assert.strictEqual(result, undefined);
                done();
            }, 1500);
        });
    });
});
