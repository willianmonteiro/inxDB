import { InxDBError } from './inxdb-error';

export class DatabaseBlockedError extends InxDBError {
	constructor() {
		super('Database request is blocked by another open connection. Close other tabs using this database.');
	}
}
