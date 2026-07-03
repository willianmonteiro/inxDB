import Connection from './connection';
import TransactionQueue from './queue';
import { isDocumentKey, matchesCriteria } from './criteria';
import { DocumentNotFoundError } from './errors';
import { promisify, transactionDone } from './idb';
import { DocumentData, DocumentSelector, WithId } from './types';

export default class DocumentSelection<T extends DocumentData> {
	constructor(
		private readonly connection: Connection,
		private readonly queue: TransactionQueue,
		private readonly collectionName: string,
		private readonly selector: DocumentSelector<T>,
	) {}

	get(): Promise<WithId<T> | undefined> {
		return this.queue.enqueue(async () => {
			const store = await this.connection.acquireStore(this.collectionName, 'readonly');
			return this.find(store);
		}, this.label('get'));
	}

	/**
	 * Merges the given changes into the matched document. The id cannot be
	 * changed. Rejects with DocumentNotFoundError when no document matches.
	 */
	update(changes: Partial<T>): Promise<WithId<T>> {
		return this.queue.enqueue(async () => {
			const store = await this.connection.acquireStore(this.collectionName, 'readwrite');
			const existing = await this.find(store);
			if (!existing) {
				throw new DocumentNotFoundError(this.collectionName, this.selector);
			}
			const updated = { ...existing, ...changes, id: existing.id };
			store.put(updated);
			await transactionDone(store.transaction);
			return updated;
		}, this.label('update'));
	}

	/** Deletes the matched document. Resolves without error when none matches. */
	delete(): Promise<void> {
		return this.queue.enqueue(async () => {
			const store = await this.connection.acquireStore(this.collectionName, 'readwrite');
			if (isDocumentKey(this.selector)) {
				store.delete(this.selector);
			} else {
				const existing = await this.find(store);
				if (existing) store.delete(existing.id);
			}
			await transactionDone(store.transaction);
		}, this.label('delete'));
	}

	private async find(store: IDBObjectStore): Promise<WithId<T> | undefined> {
		if (isDocumentKey(this.selector)) {
			return promisify(store.get(this.selector) as IDBRequest<WithId<T> | undefined>);
		}
		const criteria = this.selector as Record<string, unknown>;
		const documents = await promisify(store.getAll() as IDBRequest<WithId<T>[]>);
		return documents.find((document) => matchesCriteria(document, criteria));
	}

	private label(operation: string): string {
		return `[${operation}] ${this.collectionName}/${JSON.stringify(this.selector)}`;
	}
}
