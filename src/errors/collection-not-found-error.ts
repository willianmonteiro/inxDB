export class CollectionNotFoundError extends Error {
	constructor(collection = '') {
		const message = `Collection ${collection} not found.`;
		super(message);
		this.name = 'CollectionNotFoundError';
		Object.setPrototypeOf(this, CollectionNotFoundError.prototype);
	}
}