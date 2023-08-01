import { getCollection } from '../collections';
import { isObjectCriteria, isValidPrimitiveCriteria, matchesNestedCriteria } from '../docs';
import { CollectionNotFoundError, CollectionNotSpecifiedError } from '../errors';
import InxDB from '../inxdb';

export async function getTransactionFn<TData>(
	this: InxDB,
	options: { keys?: boolean }
): Promise<TData[]> {
	const collectionName = this.getCollectionName();
	const docSelectionCriteria = this.getDocSelectionCriteria();
	if (!collectionName) throw new CollectionNotSpecifiedError();
	const objectStore: IDBObjectStore | null = await getCollection(this, collectionName, 'readonly');
	if (!objectStore) throw new CollectionNotFoundError();

	let request: IDBRequest;
	if (isValidPrimitiveCriteria(docSelectionCriteria)) {
		request = objectStore.get(docSelectionCriteria as IDBValidKey);
	} else {
		request = objectStore.getAll();
	}

	return new Promise<TData[]>((resolve, reject) => {
		request.onsuccess = () => {
			const rawData = request.result || [];
			let filteredData = rawData;
			if (isObjectCriteria(docSelectionCriteria)) {
				filteredData = rawData.filter((doc: TData) => {
					return matchesNestedCriteria(doc, docSelectionCriteria);
				});
			} 
			const result = options.keys ? filteredData.map((data: any) => ({ key: data.id, data })) : filteredData;
			resolve(result);
			this.resetDocSelectionCriteria();
		};

		request.onerror = (event: Event) => {
			reject((event.target as IDBRequest).error);
		};
	});
}