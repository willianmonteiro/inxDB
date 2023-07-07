"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionNotSpecifiedError = void 0;
class CollectionNotSpecifiedError extends Error {
    constructor(message = 'Collection name is not specified.') {
        super(message);
        this.name = 'CollectionNotSpecifiedError';
        Object.setPrototypeOf(this, CollectionNotSpecifiedError.prototype);
    }
}
exports.CollectionNotSpecifiedError = CollectionNotSpecifiedError;
