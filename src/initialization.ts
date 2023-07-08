import InxDB from './inxdb';
import logger from './utils/logger';

export function initializeDB(instance: InxDB): void {
	const request: IDBOpenDBRequest = indexedDB.open(instance['dbName']);

	request.onerror = (event: Event) => {
		logger.error('Failed to open IndexedDB:', (event.target as IDBRequest).error);
	};

	request.onsuccess = () => {
		instance['db'] = request.result;
	};

	request.onupgradeneeded = () => {
		instance['db'] = request.result;
	};
}