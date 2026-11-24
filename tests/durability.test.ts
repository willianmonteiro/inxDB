import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import InxDB, { DatabaseBlockedError } from '../src';

describe('Durability review for the Nexos outbox', () => {
	it('preserves the existing collection if one replacement record cannot be cloned', async () => {
		const db = new InxDB('review-atomic-set');
		const drafts = db.collection('drafts');
		await drafts.add({ id: 'original', text: 'Must survive' });
		await expect(drafts.set([
			{ id: 'valid', text: 'replacement' },
			{ id: 'invalid', callback: () => undefined },
		])).rejects.toThrow();
		expect(await drafts.get()).toEqual([{ id: 'original', text: 'Must survive' }]);
		await drafts.add({ id: 'after-failure', text: 'Queue recovered' });
		expect(await drafts.get()).toHaveLength(2);
		await db.destroy();
	});

	it('creates stores concurrently through two database instances without losing either write', async () => {
		const first = new InxDB('review-concurrent-stores');
		const second = new InxDB('review-concurrent-stores');
		const result = await Promise.allSettled([
			first.collection('drafts').add({ id: 'one', text: 'First tab' }),
			second.collection('metadata').add({ id: 'two', text: 'Second tab' }),
		]);
		expect(result.map(item => item.status)).toEqual(['fulfilled', 'fulfilled']);
		expect(await first.collection('drafts').get()).toHaveLength(1);
		expect(await second.collection('metadata').get()).toHaveLength(1);
		first.close(); second.close(); await first.destroy();
	});

	it('round-trips binary updates after closing and reopening', async () => {
		const name = 'review-binary-draft';
		const first = new InxDB(name);
		const bytes = new Uint8Array([0, 255, 42, 128]);
		await first.collection('updates').add({ id: 'delta', state: bytes });
		first.close();
		const second = new InxDB(name);
		const found = await second.collection('updates').doc('delta').get();
		expect(found?.state).toEqual(bytes);
		await second.destroy();
	});

	it('rolls back a replacement when an asynchronous constraint fails', async () => {
		const native = await openNative('review-async-abort', db => {
			db.createObjectStore('drafts', { keyPath: 'id' }).createIndex('unique-label', 'label', { unique: true });
		});
		native.close();
		const db = new InxDB('review-async-abort');
		const drafts = db.collection('drafts');
		await drafts.add({ id: 'old', label: 'Original' });
		await expect(drafts.set([{ id: 'one', label: 'Duplicate' }, { id: 'two', label: 'Duplicate' }])).rejects.toThrow();
		expect(await drafts.get()).toEqual([{ id: 'old', label: 'Original' }]);
		await db.destroy();
	});

	it('preserves a record when an update cannot be cloned and accepts the next update', async () => {
		const db = new InxDB('review-update-abort');
		const drafts = db.collection('drafts');
		await drafts.add({ id: 'old', text: 'Original' });
		await expect(drafts.doc('old').update({ text: 'Invalid', callback: () => undefined })).rejects.toThrow();
		expect(await drafts.doc('old').get()).toEqual({ id: 'old', text: 'Original' });
		await drafts.doc('old').update({ text: 'Recovered' });
		expect(await drafts.doc('old').get()).toEqual({ id: 'old', text: 'Recovered' });
		await db.destroy();
	});

	it('does not later create a store for an upgrade that already rejected as blocked', async () => {
		const native = await openNative('review-blocked-upgrade', db => { db.createObjectStore('original', { keyPath: 'id' }); });
		native.onversionchange = () => undefined;
		const db = new InxDB('review-blocked-upgrade');
		await expect(db.collection('unwanted').add({ id: 'one' })).rejects.toBeInstanceOf(DatabaseBlockedError);
		native.close();
		const inspected = await openNative('review-blocked-upgrade');
		expect(inspected.objectStoreNames.contains('unwanted')).toBe(false);
		inspected.close();
		await db.collection('wanted').add({ id: 'two' });
		expect(await db.collection('wanted').get()).toEqual([{ id: 'two' }]);
		await db.destroy();
	});

	it('keeps deletion pending while blocked and runs later writes only after deletion finishes', async () => {
		const db = new InxDB('review-blocked-delete');
		await db.collection('drafts').add({ id: 'old' });
		const native = await openNative('review-blocked-delete');
		native.onversionchange = () => undefined;
		let blocked!: () => void;
		const blockedEvent = new Promise<void>(resolve => { blocked = resolve; });
		const remove = indexedDB.deleteDatabase.bind(indexedDB);
		const spy = vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(name => {
			const request = remove(name);
			request.addEventListener('blocked', blocked);
			return request;
		});
		let outcome = 'pending';
		const deletion = db.destroy().then(() => { outcome = 'deleted'; }, () => { outcome = 'rejected'; });
		const next = db.collection('drafts').add({ id: 'after-delete' });
		await blockedEvent;
		expect(outcome).toBe('pending');
		native.close();
		await deletion;
		expect(outcome).toBe('deleted');
		await next;
		expect(await db.collection('drafts').get()).toEqual([{ id: 'after-delete' }]);
		spy.mockRestore();
		await db.destroy();
	});
});

function openNative(name: string, upgrade?: (db: IDBDatabase) => void): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(name);
		request.onupgradeneeded = () => upgrade?.(request.result);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}
