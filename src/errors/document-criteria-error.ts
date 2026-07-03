import { InxDBError } from './inxdb-error';

export class DocumentCriteriaError extends InxDBError {
	constructor() {
		super('Document selector must be a key (string or number) or a non-empty criteria object.');
	}
}
