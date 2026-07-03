import Collection from './collection';
import Connection from './connection';
import TransactionQueue from './queue';
import { CollectionNotSpecifiedError, DatabaseBlockedError } from './errors';
import { AnyDocument, DocumentData } from './types';
import Logger from './utils/logger';

/**
 * Promise-based IndexedDB wrapper with a document-store API.
 * Collections (object stores) are created on demand; documents are keyed by
 * their `id` field. All operations are serialized per database instance.
 */
export default class InxDB {
	private readonly connection: Connection;
	private readonly queue: TransactionQueue;

	constructor(public readonly name: string) {
		if (!name || typeof name !== 'string') {
			throw new TypeError('Database name must be a non-empty string.');
		}
		this.connection = new Connection(name);
		this.queue = new TransactionQueue();
	}

	static isDebugMode(): boolean {
		return Logger.debugMode;
	}

	static setDebugMode(active: boolean): void {
		Logger.setDebugMode(active);
	}

	collection<T extends DocumentData = AnyDocument>(name: string): Collection<T> {
		if (!name || typeof name !== 'string') {
			throw new CollectionNotSpecifiedError();
		}
		return new Collection<T>(this.connection, this.queue, name);
	}

	/** Closes the connection. It reopens automatically on the next operation. */
	close(): void {
		this.connection.close();
	}

	/** Deletes the entire database, including all collections. */
	destroy(): Promise<void> {
		return this.queue.enqueue(() => {
			this.connection.close();
			return new Promise<void>((resolve, reject) => {
				const request = indexedDB.deleteDatabase(this.name);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
				request.onblocked = () => reject(new DatabaseBlockedError());
			});
		}, `[destroy] ${this.name}`);
	}
}
