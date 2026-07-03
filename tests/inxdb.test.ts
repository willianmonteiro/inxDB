import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import InxDB, {
	CollectionNotSpecifiedError,
	DocumentCriteriaError,
	DocumentNotFoundError,
} from '../src';

interface User {
	id?: string;
	name: string;
	age: number;
	address?: { city: string; country: string };
	visits?: number;
}

let db: InxDB;
let dbCounter = 0;

beforeEach(() => {
	db = new InxDB(`test-db-${++dbCounter}`);
});

describe('add', () => {
	it('inserts a document and returns it with its id', async () => {
		const added = await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		expect(added).toEqual({ id: 'u1', name: 'Ana', age: 30 });
		expect(await db.collection<User>('users').get()).toEqual([added]);
	});

	it('generates an id when the document has none', async () => {
		const added = await db.collection<User>('users').add({ name: 'Bia', age: 25 });
		expect(added.id).toEqual(expect.any(String));
		expect(await db.collection<User>('users').doc(added.id).get()).toEqual(added);
	});

	it('replaces an existing document with the same id (upsert)', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana Maria', age: 31 });
		expect(await db.collection<User>('users').get()).toEqual([
			{ id: 'u1', name: 'Ana Maria', age: 31 },
		]);
	});
});

describe('get', () => {
	it('returns an empty array for a new collection', async () => {
		expect(await db.collection<User>('users').get()).toEqual([]);
	});

	it('returns undefined for a missing document key', async () => {
		expect(await db.collection<User>('users').doc('missing').get()).toBeUndefined();
	});

	it('finds a document by criteria, including falsy field values', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30, visits: 0 });
		const found = await db.collection<User>('users').doc({ visits: 0 }).get();
		expect(found?.id).toBe('u1');
	});

	it('finds a document by nested criteria', async () => {
		await db.collection<User>('users').add({
			id: 'u1',
			name: 'Ana',
			age: 30,
			address: { city: 'Lisbon', country: 'PT' },
		});
		await db.collection<User>('users').add({
			id: 'u2',
			name: 'Bia',
			age: 25,
			address: { city: 'Porto', country: 'PT' },
		});
		const found = await db.collection<User>('users').doc({ address: { city: 'Porto' } }).get();
		expect(found?.id).toBe('u2');
	});
});

describe('update', () => {
	it('merges changes into only the matched document', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		await db.collection<User>('users').add({ id: 'u2', name: 'Bia', age: 25 });

		const updated = await db.collection<User>('users').doc('u1').update({ age: 31 });

		expect(updated).toEqual({ id: 'u1', name: 'Ana', age: 31 });
		expect(await db.collection<User>('users').doc('u2').get()).toEqual({
			id: 'u2',
			name: 'Bia',
			age: 25,
		});
	});

	it('updates a document matched by criteria', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		const updated = await db.collection<User>('users').doc({ name: 'Ana' }).update({ age: 40 });
		expect(updated).toEqual({ id: 'u1', name: 'Ana', age: 40 });
	});

	it('does not allow changing the document id', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		const updated = await db.collection<User>('users').doc('u1').update({ id: 'u9', age: 31 });
		expect(updated.id).toBe('u1');
		expect(await db.collection<User>('users').get()).toHaveLength(1);
	});

	it('rejects with DocumentNotFoundError when no document matches', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		await expect(db.collection<User>('users').doc('missing').update({ age: 1 }))
			.rejects.toBeInstanceOf(DocumentNotFoundError);
	});
});

describe('delete', () => {
	it('deletes a single document by key', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		await db.collection<User>('users').add({ id: 'u2', name: 'Bia', age: 25 });

		await db.collection<User>('users').doc('u1').delete();

		const remaining = await db.collection<User>('users').get();
		expect(remaining.map((user) => user.id)).toEqual(['u2']);
	});

	it('deletes a document matched by criteria', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		await db.collection<User>('users').doc({ name: 'Ana' }).delete();
		expect(await db.collection<User>('users').get()).toEqual([]);
	});

	it('resolves without error when the document does not exist', async () => {
		await expect(db.collection<User>('users').doc('missing').delete()).resolves.toBeUndefined();
	});

	it('clears the whole collection', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		await db.collection<User>('users').add({ id: 'u2', name: 'Bia', age: 25 });
		await db.collection<User>('users').delete();
		expect(await db.collection<User>('users').get()).toEqual([]);
	});
});

describe('set', () => {
	it('replaces the entire collection contents', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		const records = await db.collection<User>('users').set([
			{ id: 'u2', name: 'Bia', age: 25 },
			{ name: 'Caio', age: 40 },
		]);
		expect(records[1].id).toEqual(expect.any(String));
		expect(await db.collection<User>('users').get()).toHaveLength(2);
		expect(await db.collection<User>('users').doc('u1').get()).toBeUndefined();
	});
});

describe('collections and concurrency', () => {
	it('creates collections on demand and keeps them isolated', async () => {
		await db.collection('books').add({ id: 'b1', title: 'Dune' });
		await db.collection('movies').add({ id: 'm1', title: 'Alien' });

		expect(await db.collection('books').get()).toEqual([{ id: 'b1', title: 'Dune' }]);
		expect(await db.collection('movies').get()).toEqual([{ id: 'm1', title: 'Alien' }]);
	});

	it('routes interleaved un-awaited operations to the right collections', async () => {
		await Promise.all([
			db.collection('a').add({ id: '1', from: 'a' }),
			db.collection('b').add({ id: '1', from: 'b' }),
			db.collection('a').add({ id: '2', from: 'a' }),
		]);

		expect(await db.collection('a').get()).toHaveLength(2);
		expect(await db.collection('b').get()).toEqual([{ id: '1', from: 'b' }]);
	});
});

describe('validation', () => {
	it('throws CollectionNotSpecifiedError for an empty collection name', () => {
		expect(() => db.collection('')).toThrow(CollectionNotSpecifiedError);
	});

	it('throws DocumentCriteriaError for an invalid selector', () => {
		expect(() => db.collection('users').doc({})).toThrow(DocumentCriteriaError);
		expect(() => db.collection('users').doc(true as never)).toThrow(DocumentCriteriaError);
	});

	it('throws TypeError for an empty database name', () => {
		expect(() => new InxDB('')).toThrow(TypeError);
	});
});

describe('database lifecycle', () => {
	it('reopens automatically after close()', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		db.close();
		expect(await db.collection<User>('users').get()).toHaveLength(1);
	});

	it('destroy() deletes all data', async () => {
		await db.collection<User>('users').add({ id: 'u1', name: 'Ana', age: 30 });
		await db.destroy();
		expect(await db.collection<User>('users').get()).toEqual([]);
	});
});
