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
		for (;;) {
			let db = await this.acquire();
			try {
				if (!db.objectStoreNames.contains(storeName)) {
					this.close();
					db = await this.open(db.version + 1, storeName);
					// Another instance may have won this version with a different store.
					if (!db.objectStoreNames.contains(storeName)) continue;
				}
				return db.transaction(storeName, mode).objectStore(storeName);
			} catch (error) {
				if (!(error instanceof DOMException) || !['VersionError', 'InvalidStateError'].includes(error.name)) throw error;
				this.close();
			}
		}
	}

	close(): void {
		this.db?.close();
		this.db = null;
	}

	private acquire(): Promise<IDBDatabase> {
		if (this.db) return Promise.resolve(this.db);
		if (!this.opening) {
			const opening = this.open();
			this.opening = opening;
			const clear = () => { if (this.opening === opening) this.opening = null; };
			opening.then(clear, clear);
		}
		return this.opening;
	}

	private open(version?: number, storeToCreate?: string): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, version);
			let abandoned = false;

			request.onupgradeneeded = () => {
				if (abandoned) { request.transaction?.abort(); return; }
				if (storeToCreate && !request.result.objectStoreNames.contains(storeToCreate)) {
					request.result.createObjectStore(storeToCreate, { keyPath: 'id' });
				}
			};

			request.onblocked = () => {
				abandoned = true;
				reject(new DatabaseBlockedError());
			};

			request.onerror = () => {
				reject(request.error);
			};

			request.onsuccess = () => {
				const db = request.result;
				if (abandoned) { db.close(); return; }
				this.db = db;

				db.onversionchange = () => {
					Logger.warn(`Version change requested for "${this.dbName}"; closing connection.`);
					db.close();
					if (this.db === db) this.db = null;
				};
				db.onclose = () => {
					if (this.db === db) this.db = null;
				};

				resolve(db);
			};
		});
	}
}
