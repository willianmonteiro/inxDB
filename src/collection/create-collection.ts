import InxDB from '../inxdb';
import logger from '../utils/logger';

export function createCollection(instance: InxDB, collectionName: string): void {
	if (!instance?.['db']) return logger.error('[create-collection]: Database is not initialized.');
	const version = instance['db'].version + 1;
	instance['db'].close();

	const request = indexedDB.open(instance['dbName'], version);

	request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
		const upgradedDB = (event.target as IDBOpenDBRequest).result;
		if (!upgradedDB.objectStoreNames.contains(collectionName)) {
			upgradedDB.createObjectStore(collectionName, { keyPath: 'id' });
		}
	};

	request.onblocked = () => {
		logger.error('[create-collection]: IndexedDB is blocked. Please close other instances or tabs using the database.');
	};

	request.onsuccess = (event: Event) => {
		instance['db'] = (event.target as IDBOpenDBRequest).result;
	};

	request.onerror = (event: Event) => {
		logger.error('[create-collection]: Error opening database:', (event.target as IDBOpenDBRequest).error);
	};
}
