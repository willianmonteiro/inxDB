import Connection from './connection';
import DocumentSelection from './document-selection';
import TransactionQueue from './queue';
import { isDocumentKey, isValidCriteria } from './criteria';
import { DocumentCriteriaError } from './errors';
import { promisify, transactionDone } from './idb';
import { generateId } from './utils/generate-id';
import { DocumentData, DocumentSelector, WithId } from './types';

export default class Collection<T extends DocumentData> {
	constructor(
		private readonly connection: Connection,
		private readonly queue: TransactionQueue,
		public readonly name: string,
	) {}

	/**
	 * Selects a single document: by primary key, or the first document
	 * matching a criteria object (fields compared with strict equality,
	 * nested objects matched recursively).
	 */
	doc(selector: DocumentSelector<T>): DocumentSelection<T> {
		if (!isDocumentKey(selector) && !isValidCriteria(selector)) {
			throw new DocumentCriteriaError();
		}
		return new DocumentSelection<T>(this.connection, this.queue, this.name, selector);
	}

	get(): Promise<WithId<T>[]> {
		return this.queue.enqueue(async () => {
			const store = await this.connection.acquireStore(this.name, 'readonly');
			return promisify(store.getAll() as IDBRequest<WithId<T>[]>);
		}, `[get] ${this.name}`);
	}

	/**
	 * Inserts the document, or replaces an existing one with the same id
	 * (upsert). Generates a UUID id when the document has none.
	 */
	add(document: T): Promise<WithId<T>> {
		const record = withGeneratedId(document);
		return this.queue.enqueue(async () => {
			const store = await this.connection.acquireStore(this.name, 'readwrite');
			store.put(record);
			await transactionDone(store.transaction);
			return record;
		}, `[add] ${this.name}`);
	}

	/** Replaces the entire collection contents with the given documents. */
	set(documents: T[]): Promise<WithId<T>[]> {
		const records = documents.map(withGeneratedId);
		return this.queue.enqueue(async () => {
			const store = await this.connection.acquireStore(this.name, 'readwrite');
			store.clear();
			for (const record of records) {
				store.put(record);
			}
			await transactionDone(store.transaction);
			return records;
		}, `[set] ${this.name}`);
	}

	/** Deletes every document in the collection. */
	delete(): Promise<void> {
		return this.queue.enqueue(async () => {
			const store = await this.connection.acquireStore(this.name, 'readwrite');
			store.clear();
			await transactionDone(store.transaction);
		}, `[delete] ${this.name}`);
	}
}

function withGeneratedId<T extends DocumentData>(document: T): WithId<T> {
	return { ...document, id: document.id ?? generateId() } as WithId<T>;
}
