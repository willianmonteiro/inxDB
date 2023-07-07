"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionNotFoundError = void 0;
class CollectionNotFoundError extends Error {
    constructor(collection = '') {
        const message = `Collection ${collection} not found.`;
        super(message);
        this.name = 'CollectionNotFoundError';
        Object.setPrototypeOf(this, CollectionNotFoundError.prototype);
    }
}
exports.CollectionNotFoundError = CollectionNotFoundError;
