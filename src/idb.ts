export function promisify<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted.'));
		transaction.onerror = () => reject(transaction.error);
	});
}

/** Abort queued writes even when an IndexedDB request throws synchronously. */
export async function writeTransaction<T>(store: IDBObjectStore, operation: () => T | Promise<T>): Promise<T> {
	const transaction = store.transaction;
	const completion = transactionDone(transaction).then(
		() => ({ ok: true as const }),
		(error: unknown) => ({ ok: false as const, error }),
	);
	try {
		const result = await operation();
		const completed = await completion;
		if (!completed.ok) throw completed.error;
		return result;
	} catch (error) {
		try {
			transaction.abort();
		} catch {
			// The transaction may already have aborted after a request failure.
		}
		await completion;
		throw error;
	}
}
