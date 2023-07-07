import InxDB from '../inxdb';
import logger from '../utils/logger';
import { createCollection } from './create-collection';

export function getCollection(instance: InxDB, collectionName: string, mode: IDBTransactionMode = 'readwrite'): IDBObjectStore | null {
	if (!instance['db']) { 
		logger.error('Database is not initialized.');
		return null;
	}

	if (!instance['db'].objectStoreNames.contains(collectionName)) { 
		createCollection(instance, collectionName);
	}

	const transaction: IDBTransaction = instance['db'].transaction(collectionName, mode); 
	return transaction.objectStore(collectionName);
}
