export class DocumentCriteriaError extends Error {
	constructor(message = 'Document selection criteria is not specified.') {
		super(message);
		this.name = 'DocumentCriteriaError';
		Object.setPrototypeOf(this, DocumentCriteriaError.prototype);
	}
}