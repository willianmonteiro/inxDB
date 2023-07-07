"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentCriteriaError = void 0;
class DocumentCriteriaError extends Error {
    constructor(message = 'Document selection criteria is not specified.') {
        super(message);
        this.name = 'DocumentCriteriaError';
        Object.setPrototypeOf(this, DocumentCriteriaError.prototype);
    }
}
exports.DocumentCriteriaError = DocumentCriteriaError;
