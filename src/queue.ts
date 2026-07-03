import Logger from './utils/logger';

/**
 * Serializes database operations. Creating a missing object store requires
 * closing and reopening the connection with a version bump, so operations
 * must never interleave.
 */
export default class TransactionQueue {
	private tail: Promise<unknown> = Promise.resolve();

	enqueue<T>(operation: () => Promise<T>, label = 'operation'): Promise<T> {
		const result = this.tail.then(() => {
			Logger.log(`[queue] ${label}`);
			return operation();
		});
		this.tail = result.then(
			() => undefined,
			(error) => Logger.error(`[queue] ${label} failed:`, error),
		);
		return result;
	}
}
