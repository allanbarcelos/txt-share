'use strict';
// cron.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');

const { cache, txtDBPrefixKey } = require('../cache');
const { cleanupExpiredTXT } = require('../cron');

function insertItem(item, ttl = 3600) {
    cache.set(`${txtDBPrefixKey}${item.id}`, item, ttl);
}

function clearAll() {
    const keys = cache.keys().filter(k => k.startsWith(txtDBPrefixKey));
    keys.forEach(k => cache.del(k));
}

describe('cleanupExpiredTXT', () => {
    beforeEach(() => {
        clearAll();
    });

    test('item with future validUntil is NOT deleted', () => {
        const item = {
            id: 's_test001',
            createdAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 3600000).toISOString(),
            txt: 'hello',
        };
        insertItem(item, 3600);

        const count = cleanupExpiredTXT();

        assert.strictEqual(count, 0);
        const remaining = cache.get(`${txtDBPrefixKey}${item.id}`);
        assert.ok(remaining, 'item should still exist');
    });

    test('item with past validUntil IS deleted', () => {
        const item = {
            id: 's_test002',
            createdAt: new Date().toISOString(),
            validUntil: new Date(Date.now() - 1000).toISOString(), // 1 second ago
            txt: 'expired',
        };
        insertItem(item, 3600);

        const count = cleanupExpiredTXT();

        assert.strictEqual(count, 1);
        const remaining = cache.get(`${txtDBPrefixKey}${item.id}`);
        assert.strictEqual(remaining, undefined);
    });

    test('item that was renewed (validUntil extended) is NOT deleted', () => {
        const item = {
            id: 's_test003',
            createdAt: new Date(Date.now() - 7200000).toISOString(), // created 2 hours ago
            validUntil: new Date(Date.now() + 3600000).toISOString(), // renewed 1 hour from now
            txt: 'renewed',
        };
        insertItem(item, 3600);

        const count = cleanupExpiredTXT();

        assert.strictEqual(count, 0);
        const remaining = cache.get(`${txtDBPrefixKey}${item.id}`);
        assert.ok(remaining, 'renewed item should still exist');
    });

    test('returns correct count when multiple items expired', () => {
        const expired1 = {
            id: 's_test004',
            createdAt: new Date().toISOString(),
            validUntil: new Date(Date.now() - 2000).toISOString(),
            txt: 'exp1',
        };
        const expired2 = {
            id: 's_test005',
            createdAt: new Date().toISOString(),
            validUntil: new Date(Date.now() - 1000).toISOString(),
            txt: 'exp2',
        };
        const fresh = {
            id: 's_test006',
            createdAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 3600000).toISOString(),
            txt: 'fresh',
        };
        insertItem(expired1, 3600);
        insertItem(expired2, 3600);
        insertItem(fresh, 3600);

        const count = cleanupExpiredTXT();

        assert.strictEqual(count, 2);
        assert.strictEqual(cache.get(`${txtDBPrefixKey}${expired1.id}`), undefined);
        assert.strictEqual(cache.get(`${txtDBPrefixKey}${expired2.id}`), undefined);
        assert.ok(cache.get(`${txtDBPrefixKey}${fresh.id}`), 'fresh item should remain');
    });

    test('works correctly with empty cache', () => {
        const count = cleanupExpiredTXT();
        assert.strictEqual(count, 0);
    });

    test('ignores items with invalid validUntil', () => {
        const item = {
            id: 's_test007',
            createdAt: new Date().toISOString(),
            validUntil: 'not-a-date',
            txt: 'invalid date',
        };
        insertItem(item, 3600);

        const count = cleanupExpiredTXT();

        // Invalid validUntil should not cause crash and item should not be deleted
        assert.strictEqual(count, 0);
    });

    test('ignores items with missing validUntil', () => {
        const item = {
            id: 's_test008',
            createdAt: new Date().toISOString(),
            txt: 'no validUntil',
        };
        insertItem(item, 3600);

        const count = cleanupExpiredTXT();

        assert.strictEqual(count, 0);
    });
});
