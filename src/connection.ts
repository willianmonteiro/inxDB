import { DatabaseBlockedError } from './errors';
import Logger from './utils/logger';

export default class Connection {
	private db: IDBDatabase | null = null;
	private opening: Promise<IDBDatabase> | null = null;

	constructor(private readonly dbName: string) {}

	/**
	 * Returns the requested object store in a fresh transaction, creating the
	 * store through a version upgrade if it does not exist yet. Callers must be
	 * serialized (see TransactionQueue) because the upgrade path closes and
	 * reopens the connection.
	 */
	async acquireStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
		let db = await this.acquire();
		if (!db.objectStoreNames.contains(storeName)) {
			this.close();
			db = await this.open(db.version + 1, storeName);
		}
		return db.transaction(storeName, mode).objectStore(storeName);
	}

	close(): void {
		this.db?.close();
		this.db = null;
	}

	private acquire(): Promise<IDBDatabase> {
		if (this.db) return Promise.resolve(this.db);
		if (!this.opening) this.opening = this.open();
		return this.opening;
	}

	private open(version?: number, storeToCreate?: string): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, version);

			request.onupgradeneeded = () => {
				if (storeToCreate && !request.result.objectStoreNames.contains(storeToCreate)) {
					request.result.createObjectStore(storeToCreate, { keyPath: 'id' });
				}
			};

			request.onblocked = () => {
				this.opening = null;
				reject(new DatabaseBlockedError());
			};

			request.onerror = () => {
				this.opening = null;
				reject(request.error);
			};

			request.onsuccess = () => {
				const db = request.result;
				this.opening = null;
				this.db = db;

				db.onversionchange = () => {
					Logger.warn(`Version change requested for "${this.dbName}"; closing connection.`);
					this.close();
				};
				db.onclose = () => {
					this.db = null;
				};

				resolve(db);
			};
		});
	}
}
