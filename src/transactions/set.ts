import { getCollection } from '../collections';
import { CollectionNotFoundError, CollectionNotSpecifiedError } from '../errors';
import InxDB from '../inxdb';

export async function setTransactionFn<TData>(
	this: InxDB,
	newDocument: TData[]
): Promise<void> {
	const collectionName = this.getCollectionName();

	if (!collectionName) throw new CollectionNotSpecifiedError();
	const objectStore: IDBObjectStore | null = await getCollection(this, collectionName);
	if (!objectStore) throw new CollectionNotFoundError(collectionName);

	const clearRequest: IDBRequest = objectStore.clear();

	return new Promise<void>((resolve, reject) => {
		clearRequest.onsuccess = () => {
			const updates: Promise<void>[] = [];
			newDocument.forEach((doc: TData) => {
				const updateRequest: IDBRequest<IDBValidKey> = objectStore.put(doc);
				updates.push(new Promise<void>((innerResolve, innerReject) => {
					updateRequest.onsuccess = () => {
						innerResolve();
					};
					updateRequest.onerror = (event: Event) => {
						innerReject((event.target as IDBRequest).error);
					};
				}));
			});

			Promise.all(updates)
				.then(() => resolve())
				.catch((error) => reject(error));
		};

		clearRequest.onerror = (event: Event) => {
			reject((event.target as IDBRequest).error);
		};
	});
}
