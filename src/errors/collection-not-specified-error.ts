export class CollectionNotSpecifiedError extends Error {
	constructor(message = 'Collection name is not specified.') {
		super(message);
		this.name = 'CollectionNotSpecifiedError';
		Object.setPrototypeOf(this, CollectionNotSpecifiedError.prototype);
	}
}