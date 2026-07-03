import { InxDBError } from './inxdb-error';

export class CollectionNotSpecifiedError extends InxDBError {
	constructor() {
		super('Collection name must be a non-empty string.');
	}
}
