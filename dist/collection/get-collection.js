"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollection = void 0;
const logger_1 = require("../utils/logger");
const create_collection_1 = require("./create-collection");
function getCollection(instance, collectionName, mode = 'readwrite') {
    if (!instance['db']) {
        logger_1.default.error('Database is not initialized.');
        return null;
    }
    if (!instance['db'].objectStoreNames.contains(collectionName)) {
        (0, create_collection_1.createCollection)(instance, collectionName);
    }
    const transaction = instance['db'].transaction(collectionName, mode);
    return transaction.objectStore(collectionName);
}
exports.getCollection = getCollection;
