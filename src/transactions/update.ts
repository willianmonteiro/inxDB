import { getCollection } from '../collections';
import { CollectionNotFoundError, CollectionNotSpecifiedError, DocumentCriteriaError } from '../errors';
import InxDB from '../inxdb';

export async function updateTransactionFn<TData>(
	this: InxDB,
	docUpdates: Partial<TData>
): Promise<TData> {
	const collectionName = this.getCollectionName();
	const docSelectionCriteria = this.getDocSelectionCriteria();
	if (!collectionName) throw new CollectionNotSpecifiedError();
	if (!docSelectionCriteria) throw new DocumentCriteriaError();
	const objectStore: IDBObjectStore | null = await getCollection(this, collectionName);
	if (!objectStore) throw new CollectionNotFoundError(collectionName);

	const request: IDBRequest = objectStore.getAllKeys();
	const updates: Promise<void>[] = [];

	request.onsuccess = () => {
		const keys: any[] = request.result;
		keys.forEach((key: any) => {
			const getRequest: IDBRequest = objectStore.get(key);
			let updateRequest: IDBRequest;

			getRequest.onsuccess = () => {
				const document: TData = getRequest.result;
				const updatedDocument: TData = { ...document, ...docUpdates };
				updateRequest = objectStore.put(updatedDocument, key);

				updateRequest.onerror = (event: Event) => {
					throw (event.target as IDBRequest).error;
				};
			};

			getRequest.onerror = (event: Event) => {
				throw (event.target as IDBRequest).error;
			};

			updates.push(new Promise<void>((innerResolve, innerReject) => {
				updateRequest.onsuccess = () => {
					innerResolve();
				};

				updateRequest.onerror = (event: Event) => {
					innerReject((event.target as IDBRequest).error);
				};
			}));
		});

		return Promise.all(updates);
	};

	return new Promise<TData>((resolve, reject) => {
		request.onerror = (event: Event) => {
			reject((event.target as IDBRequest).error);
		};
	});
}
