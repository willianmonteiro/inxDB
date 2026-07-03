# InxDB

A promise-based IndexedDB wrapper with a document-store API.

IndexedDB is the only database built into every browser, but its API is event-driven, verbose, and easy to get wrong: manual version management, transaction lifecycles, request callbacks. InxDB hides all of that behind a small, typed, Firestore-style API — you work with collections and documents, and schema management happens automatically.

```ts
import InxDB from 'inxdb';

const db = new InxDB('my-app');

await db.collection('users').add({ id: 'u1', name: 'Ana', age: 30 });
const user = await db.collection('users').doc('u1').get();
```

> **Try it live**: the [InxDB Playground](https://github.com/willianmonteiro/inxDB-playground) runs the whole API against a real IndexedDB in your browser — preset examples, an editor, and a live view of the database state.

## Why InxDB

- **No schema ceremony** — collections (object stores) are created on demand; version upgrades are handled internally.
- **Promises everywhere** — every operation returns a promise that resolves when the data is durably committed.
- **Typed** — full TypeScript generics: `db.collection<User>('users')` types every operation end to end.
- **Safe by construction** — operations are serialized per database, and writes resolve only after the transaction commits.
- **Tiny** — no dependencies, tree-shakeable ESM (CJS also shipped).

## Installation

```sh
npm install inxdb
```

```ts
import InxDB from 'inxdb';            // ESM
const { InxDB } = require('inxdb');   // CommonJS
```

## API

### `new InxDB(name)`

Opens (lazily) a database with the given name. Throws `TypeError` if the name is not a non-empty string.

```ts
const db = new InxDB('my-app');
```

| Method | Returns | Description |
| --- | --- | --- |
| `db.collection<T>(name)` | `Collection<T>` | Handle to a collection; created in IndexedDB on first use. |
| `db.close()` | `void` | Closes the connection. Reopens automatically on the next operation. |
| `db.destroy()` | `Promise<void>` | Deletes the entire database. |
| `InxDB.setDebugMode(on)` | `void` | Logs every internal operation to the console. |

Documents are plain objects keyed by their `id` field (`string` or `number`). If you add a document without an `id`, InxDB generates a UUID for it.

### `Collection<T>`

```ts
interface User {
  id?: string;
  name: string;
  age: number;
  address?: { city: string; country: string };
}

const users = db.collection<User>('users');
```

#### `get(): Promise<WithId<T>[]>`

Returns all documents in the collection (empty array if the collection is new).

```ts
const all = await users.get();
```

#### `add(document): Promise<WithId<T>>`

Inserts the document, or **replaces** an existing one with the same `id` (upsert). Returns the stored document, including a generated `id` when one was missing.

```ts
await users.add({ id: 'u1', name: 'Ana', age: 30 });
const bia = await users.add({ name: 'Bia', age: 25 }); // bia.id is a generated UUID
```

#### `set(documents): Promise<WithId<T>[]>`

Replaces the **entire collection contents** atomically — a clear plus all inserts in one transaction.

```ts
await users.set([
  { id: 'u1', name: 'Ana', age: 30 },
  { id: 'u2', name: 'Bia', age: 25 },
]);
```

#### `delete(): Promise<void>`

Deletes every document in the collection.

```ts
await users.delete();
```

#### `doc(selector): DocumentSelection<T>`

Selects a single document, either by key or by a criteria object:

```ts
users.doc('u1');                               // by primary key
users.doc({ name: 'Ana' });                    // first document matching all fields
users.doc({ address: { city: 'Lisbon' } });    // nested fields match partially
```

Criteria fields are compared with strict equality (falsy values like `0`, `''`, and `false` work). Throws `DocumentCriteriaError` for an empty or invalid selector.

### `DocumentSelection<T>`

#### `get(): Promise<WithId<T> | undefined>`

Returns the matched document, or `undefined` when none matches.

```ts
const ana = await users.doc('u1').get();
```

#### `update(changes): Promise<WithId<T>>`

Merges `changes` into the matched document and returns the result. The `id` cannot be changed. Rejects with `DocumentNotFoundError` when no document matches.

```ts
const updated = await users.doc('u1').update({ age: 31 });
```

#### `delete(): Promise<void>`

Deletes the matched document. Resolves without error when nothing matches.

```ts
await users.doc('u1').delete();
```

### Errors

All errors extend `InxDBError`, so a single `instanceof` check catches everything the library throws.

| Error | Thrown when |
| --- | --- |
| `CollectionNotSpecifiedError` | `collection()` is called with an empty or non-string name. |
| `DocumentCriteriaError` | `doc()` is called with an invalid selector. |
| `DocumentNotFoundError` | `update()` matches no document. |
| `DatabaseBlockedError` | Another open connection (e.g. another tab) blocks an upgrade or deletion. |

```ts
import { InxDBError, DocumentNotFoundError } from 'inxdb';

try {
  await users.doc('missing').update({ age: 1 });
} catch (error) {
  if (error instanceof DocumentNotFoundError) {
    // create it instead
  }
}
```

## Compared with raw IndexedDB

Updating a single field on one record, with raw IndexedDB:

```js
const open = indexedDB.open('my-app', 2);
open.onupgradeneeded = () => {
  if (!open.result.objectStoreNames.contains('users')) {
    open.result.createObjectStore('users', { keyPath: 'id' });
  }
};
open.onsuccess = () => {
  const db = open.result;
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  const get = store.get('u1');
  get.onsuccess = () => {
    const user = get.result;
    if (!user) return;
    user.age = 31;
    store.put(user);
  };
  tx.oncomplete = () => db.close();
  tx.onerror = () => console.error(tx.error);
};
open.onerror = () => console.error(open.error);
```

The same operation with InxDB:

```ts
await db.collection('users').doc('u1').update({ age: 31 });
```

You also stop maintaining the version number by hand — with raw IndexedDB, adding a store means bumping the version constant everywhere and writing migration code in `onupgradeneeded`. InxDB tracks versions internally and creates stores the first time they are used.

## Browser compatibility

InxDB runs on the standard [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), available in every modern browser (Chrome, Firefox, Safari 10+, Edge) and web workers. Notes:

- **Private browsing**: older Firefox and Safari versions restrict or wipe IndexedDB in private windows; treat storage as best-effort there.
- **Storage limits** are browser-managed and origin-scoped; use `navigator.storage.estimate()` to inspect quota.
- **Node.js**: IndexedDB does not exist in Node. For tests, use [`fake-indexeddb`](https://github.com/dumbmatter/fakeIndexedDB) (this repo's own test suite does).

## Migrating from 1.x

The chained call syntax is unchanged, but 2.0 is a breaking release:

- `collection()` / `doc()` now return dedicated handles instead of mutating the `InxDB` instance — split-statement usage like `db.collection('x'); db.add(...)` must become `db.collection('x').add(...)`.
- `doc(selector).get()` returns a single document or `undefined` (1.x's `T[]` return type was never accurate for key lookups).
- `get({ keys: true })` was removed — the key is always `doc.id`.
- `update()` now actually works: it updates only the selected document and rejects with `DocumentNotFoundError` when nothing matches.
- `add()` without an `id` now generates a UUID instead of throwing.
- Invalid names/selectors throw immediately instead of failing later.

## Development

```sh
npm install
npm test         # vitest + fake-indexeddb
npm run lint
npm run build    # ESM + CJS to dist/
```

## License

MIT — see [licence](licence).
