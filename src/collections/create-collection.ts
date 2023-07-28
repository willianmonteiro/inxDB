import InxDB from '../inxdb';

export async function createCollection(instance: InxDB, collectionName: string, reset?: boolean): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		if (!instance['db']) {
			reject(new Error('Database is not open.'));
			return;
		}

		if (instance['db'].objectStoreNames.contains(collectionName)) {
			// Collection already exists, no need to create it again
			resolve(true);
			return;
		}

		const version = reset ? undefined : instance['db'].version + 1;
		instance['db'].close();

		const request: IDBOpenDBRequest = indexedDB.open(instance['dbName'], version);

		request.onblocked = () => {
			const error = 'IndexedDB is blocked. Please close other instances or tabs using the database.';
			reject(new Error(error));
		};

		request.onerror = (event: Event) => {
			reject((event.target as IDBRequest).error);
		};

		request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
			const upgradedDB = (event.target as IDBOpenDBRequest).result;
			if (!upgradedDB.objectStoreNames.contains(collectionName)) {
				upgradedDB.createObjectStore(collectionName, { keyPath: 'id' });
			}
		};

		request.onsuccess = () => {
			instance['db'] = request.result;
			resolve(true);
		};
	});
}
