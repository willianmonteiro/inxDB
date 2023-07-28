/* eslint-disable @typescript-eslint/ban-ts-comment */
import { connectToDatabase } from '../opendb';
import InxDB from '../inxdb';
import logger from '../utils/logger';
import { createCollection } from './create-collection';

export async function getCollection(instance: InxDB, collectionName: string, mode: IDBTransactionMode = 'readwrite'): Promise<IDBObjectStore | null> {
	await connectToDatabase(instance);
	try {
		// If Collection doesn't exists will be created
		await createCollection(instance, collectionName);
		// @ts-ignore - The existence of the instance is being ensured by calling function connectToDatabase
		const transaction: IDBTransaction = instance['db'].transaction(collectionName, mode);
		return transaction.objectStore(collectionName);
	} catch (error) {
		// @ts-ignore
		if (error.name === 'NotFoundError') {
			// Collection not found even after tried to create, try to create it again with version reset
			const created = await createCollection(instance, collectionName, true);
			if (created) {
				// @ts-ignore
				const transaction: IDBTransaction = instance['db'].transaction(collectionName, mode);
				return transaction.objectStore(collectionName);
			}
		}
		logger.error(`[get-collection]: ${collectionName} - ${error}`);
		return null;
	}
}
