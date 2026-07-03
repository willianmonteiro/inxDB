import { InxDBError } from './inxdb-error';

export class DocumentNotFoundError extends InxDBError {
	constructor(collectionName: string, selector: unknown) {
		super(`No document matching ${JSON.stringify(selector)} in collection "${collectionName}".`);
	}
}
