import { getCollection } from '../collections';
import { CollectionNotFoundError, CollectionNotSpecifiedError } from '../errors';
import InxDB from '../inxdb';

export async function deleteTransactionFn(this: InxDB): Promise<void> {
	const collectionName = this.getCollectionName();
	const docSelectionCriteria = this.getDocSelectionCriteria();
	if (!collectionName) throw new CollectionNotSpecifiedError();
	const objectStore: IDBObjectStore | null = await getCollection(this, collectionName, 'readwrite');
	if (!objectStore) throw new CollectionNotFoundError(collectionName);

	const request: IDBRequest = docSelectionCriteria
		? objectStore.delete(docSelectionCriteria as IDBValidKey)
		: objectStore.clear();

	return new Promise<void>((resolve, reject) => {
		request.onsuccess = () => {
			resolve();
			this.resetDocSelectionCriteria();
		};

		request.onerror = (event: Event) => {
			reject((event.target as IDBRequest).error);
		};
	});
}
