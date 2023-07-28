"use strict";
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable max-lines */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const collections_1 = require("./collections");
const docs_1 = require("./docs");
const errors_1 = require("./errors");
const queue_1 = require("./queue");
const logger_1 = require("./utils/logger");
/**
 * IndexedDB wrapper for handling offline database operations.
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
class InxDB {
    constructor(dbName) {
        this.dbName = dbName;
        this.db = null;
        this.isOpen = false;
        this.collectionName = null;
        this.collectionSelected = false;
        this.docSelectionCriteria = null;
        this.userErrors = [];
        this.queue = new queue_1.default();
        this.collection = this.collection.bind(this);
        this.doc = this.doc.bind(this);
        this.get = this.get.bind(this);
        this.add = this.add.bind(this);
        this.update = this.update.bind(this);
        this.set = this.set.bind(this);
        this.delete = this.delete.bind(this);
    }
    getObjectStore(collectionName, mode = 'readwrite') {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, collections_1.getCollection)(this, collectionName, mode);
        });
    }
    resetErrors() {
        this.userErrors = [];
    }
    collection(collectionName) {
        this.resetErrors();
        this.collectionSelected = true;
        if (!collectionName) {
            this.userErrors.push('No collection name specified in collection() method.');
            return this;
        }
        if (typeof collectionName !== 'string') {
            this.userErrors.push('Collection name in collection() method must be a string and not an object, number, or boolean.');
            return this;
        }
        this.collectionName = collectionName;
        return this;
    }
    doc(docSelectionCriteria) {
        if (!this.collectionSelected) {
            this.userErrors.push('No collection selected. Use collection() method to select a collection first.');
        }
        else if (!docSelectionCriteria) {
            this.userErrors.push('No document criteria specified in doc() method. Use a string or an object.');
        }
        else if (typeof docSelectionCriteria !== 'string' && typeof docSelectionCriteria !== 'object') {
            this.userErrors.push('Document criteria specified in doc() method must be a string or an object.');
        }
        else {
            this.docSelectionCriteria = docSelectionCriteria;
        }
        return this;
    }
    get(options = { keys: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const transactionFn = () => __awaiter(this, void 0, void 0, function* () {
                    if (!this.collectionName) {
                        reject(new errors_1.CollectionNotSpecifiedError());
                        return;
                    }
                    const objectStore = yield this.getObjectStore(this.collectionName, 'readonly');
                    if (!objectStore) {
                        reject(new errors_1.CollectionNotFoundError());
                        return;
                    }
                    let request;
                    // filter document by key
                    if ((0, docs_1.isValidPrimitiveCriteria)(this === null || this === void 0 ? void 0 : this.docSelectionCriteria)) {
                        request = objectStore.get(this.docSelectionCriteria);
                    }
                    else {
                        request = objectStore.getAll();
                    }
                    request.onsuccess = () => {
                        let result = [];
                        // filter by criteria
                        if ((0, docs_1.isObjectCriteria)(this === null || this === void 0 ? void 0 : this.docSelectionCriteria)) {
                            result = request.result.filter((doc) => {
                                return (0, docs_1.matchesNestedCriteria)(doc, this.docSelectionCriteria);
                            });
                        }
                        else {
                            result = request.result;
                        }
                        result = options.keys ? result.map((data) => ({ key: data.id, data })) : result;
                        resolve(result);
                        this.docSelectionCriteria = null; // Reset the docSelectionCriteria
                    };
                    request.onerror = (event) => {
                        reject(event.target.error);
                    };
                });
                this.queue.enqueue(transactionFn);
            });
        });
    }
    add(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const transactionFn = () => __awaiter(this, void 0, void 0, function* () {
                    if (!this.collectionName) {
                        reject(new errors_1.CollectionNotSpecifiedError());
                        return;
                    }
                    const objectStore = yield this.getObjectStore(this.collectionName);
                    if (!objectStore) {
                        reject(new errors_1.CollectionNotFoundError());
                        return;
                    }
                    // Check if there are any user errors
                    if (this.userErrors.length) {
                        logger_1.default.error('Add operation cannot be performed due to user errors:', ...this.userErrors);
                        reject(new Error('Add operation cannot be performed due to user errors.'));
                        return;
                    }
                    const getRequest = (data === null || data === void 0 ? void 0 : data.id) ? objectStore.get(data === null || data === void 0 ? void 0 : data.id) : null;
                    getRequest === null || getRequest === void 0 ? void 0 : getRequest.addEventListener('success', (event) => {
                        const existingData = event.target.result;
                        if (existingData) {
                            // Key already exists, update the existing object
                            const updateRequest = objectStore.put(data);
                            updateRequest.onsuccess = () => {
                                resolve(data);
                            };
                            updateRequest.onerror = (_event) => {
                                reject(_event.target.error);
                            };
                        }
                        else {
                            // Key doesn't exist, add the new object
                            const addRequest = objectStore.add(data);
                            addRequest.onsuccess = () => {
                                resolve(data);
                            };
                            addRequest.onerror = (_event) => {
                                reject(_event.target.error);
                            };
                        }
                    });
                    getRequest === null || getRequest === void 0 ? void 0 : getRequest.addEventListener('error', (event) => {
                        reject(event.target.error);
                    });
                });
                this.queue.enqueue(transactionFn);
            });
        });
    }
    update(docUpdates) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const transactionFn = () => __awaiter(this, void 0, void 0, function* () {
                    if (!this.collectionName) {
                        reject(new errors_1.CollectionNotSpecifiedError());
                        return;
                    }
                    if (!this.docSelectionCriteria) {
                        reject(new errors_1.DocumentCriteriaError());
                        return;
                    }
                    const objectStore = yield this.getObjectStore(this.collectionName);
                    if (!objectStore) {
                        reject(new errors_1.CollectionNotFoundError(this.collectionName));
                        return;
                    }
                    const request = objectStore.getAllKeys();
                    const updates = [];
                    request.onsuccess = () => {
                        const keys = request.result;
                        keys.forEach((key) => {
                            const getRequest = objectStore.get(key);
                            let updateRequest;
                            getRequest.onsuccess = () => {
                                const document = getRequest.result;
                                const updatedDocument = Object.assign(Object.assign({}, document), docUpdates);
                                updateRequest = objectStore.put(updatedDocument, key);
                                updateRequest.onerror = (event) => {
                                    reject(event.target.error);
                                };
                            };
                            getRequest.onerror = (event) => {
                                reject(event.target.error);
                            };
                            updates.push(new Promise((innerResolve, innerReject) => {
                                updateRequest.onsuccess = () => {
                                    innerResolve();
                                };
                                updateRequest.onerror = (event) => {
                                    innerReject(event.target.error);
                                };
                            }));
                        });
                        Promise.all(updates)
                            .then(() => {
                            resolve(docUpdates);
                        })
                            .catch((error) => {
                            reject(error);
                        });
                    };
                    request.onerror = (event) => {
                        reject(event.target.error);
                    };
                });
                this.queue.enqueue(transactionFn);
            });
        });
    }
    set(newDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const transactionFn = () => __awaiter(this, void 0, void 0, function* () {
                    if (!this.collectionName) {
                        reject(new errors_1.CollectionNotSpecifiedError());
                        return;
                    }
                    const objectStore = yield this.getObjectStore(this.collectionName);
                    if (!objectStore) {
                        reject(new errors_1.CollectionNotFoundError(this.collectionName));
                        return;
                    }
                    const clearRequest = objectStore.clear();
                    clearRequest.onsuccess = () => {
                        newDocument.forEach((doc) => {
                            objectStore.add(doc);
                        });
                        resolve();
                    };
                    clearRequest.onerror = (event) => {
                        reject(event.target.error);
                    };
                });
                this.queue.enqueue(transactionFn);
            });
        });
    }
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const transactionFn = () => __awaiter(this, void 0, void 0, function* () {
                    if (!this.collectionName) {
                        reject(new errors_1.CollectionNotSpecifiedError());
                        return;
                    }
                    const objectStore = yield this.getObjectStore(this.collectionName, 'readwrite');
                    if (!objectStore) {
                        reject(new errors_1.CollectionNotFoundError(this.collectionName));
                        return;
                    }
                    let request;
                    if (this.docSelectionCriteria) {
                        request = objectStore.delete(this.docSelectionCriteria);
                    }
                    else {
                        request = objectStore.clear();
                    }
                    request.onsuccess = () => {
                        resolve();
                        this.docSelectionCriteria = null; // Reset the docSelectionCriteria
                    };
                    request.onerror = (event) => {
                        reject(event.target.error);
                    };
                });
                this.queue.enqueue(transactionFn);
            });
        });
    }
}
exports.default = InxDB;
