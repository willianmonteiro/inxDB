import InxDB from '../inxdb';
import { CollectionNotFoundError, CollectionNotSpecifiedError } from '../errors';
import { getCollection } from '../collections';

export async function addTransactionFn<TData>(
	this: InxDB,
	data: TData & { id?: string | number }
): Promise<TData> {
	const collectionName = this.getCollectionName();
	if (!collectionName) throw new CollectionNotSpecifiedError();
	const objectStore: IDBObjectStore | null = await getCollection(this, collectionName);
	if (!objectStore) throw new CollectionNotFoundError();
	const getRequest: IDBRequest | null = data?.id ? objectStore.get(data?.id) : null;

	return new Promise<TData>((resolve, reject) => {
		getRequest?.addEventListener('success', (event: Event) => {
			const existingData: object | undefined = (event.target as IDBRequest).result;
			if (existingData) {
				// Key already exists, update the existing object
				const updateRequest: IDBRequest = objectStore.put(data);

				updateRequest.onsuccess = () => {
					resolve(data);
				};

				updateRequest.onerror = (_event: Event) => {
					reject((_event.target as IDBRequest).error);
				};
			} else {
				// Key doesn't exist, add the new object
				const addRequest: IDBRequest<IDBValidKey> = objectStore.add(data);

				addRequest.onsuccess = () => {
					resolve(data);
				};

				addRequest.onerror = (_event: Event) => {
					reject((_event.target as IDBRequest).error);
				};
			}
		});

		getRequest?.addEventListener('error', (event: Event) => {
			reject((event.target as IDBRequest).error);
		});
	});
}
