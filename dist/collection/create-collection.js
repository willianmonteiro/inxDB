"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCollection = void 0;
const logger_1 = require("../utils/logger");
function createCollection(instance, collectionName) {
    if (!(instance === null || instance === void 0 ? void 0 : instance['db']))
        return logger_1.default.error('Database is not initialized.');
    const version = instance['db'].version + 1;
    instance['db'].close();
    const request = indexedDB.open(instance['dbName'], version);
    request.onupgradeneeded = (event) => {
        const upgradedDB = event.target.result;
        if (!upgradedDB.objectStoreNames.contains(collectionName)) {
            upgradedDB.createObjectStore(collectionName, { keyPath: 'id' });
        }
    };
    request.onsuccess = (event) => {
        instance['db'] = event.target.result;
    };
    request.onerror = (event) => {
        logger_1.default.error('Error opening database:', event.target.error);
    };
}
exports.createCollection = createCollection;
