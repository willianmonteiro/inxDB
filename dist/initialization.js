"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDB = void 0;
const logger_1 = require("./utils/logger");
function initializeDB(instance) {
    const request = indexedDB.open(instance['dbName']);
    request.onerror = (event) => {
        logger_1.default.error('Failed to open IndexedDB:', event.target.error);
    };
    request.onsuccess = () => {
        instance['db'] = request.result;
    };
    request.onupgradeneeded = () => {
        instance['db'] = request.result;
    };
}
exports.initializeDB = initializeDB;
