"use strict";
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
const transactions_1 = require("./transactions");
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
    static isDebugMode() {
        return logger_1.default.debugMode;
    }
    static setDebugMode(active) {
        logger_1.default.setDebugMode(active);
    }
    getCollectionName() {
        return this.collectionName;
    }
    isCollectionSelected() {
        return this.collectionSelected;
    }
    getDocSelectionCriteria() {
        return this.docSelectionCriteria;
    }
    resetDocSelectionCriteria() {
        this.docSelectionCriteria = null;
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
            const transactionFn = transactions_1.getTransactionFn.bind(this, options);
            return this.queue.enqueue(transactionFn, `[get]: ${this.collectionName}`);
        });
    }
    add(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.userErrors.length) {
                logger_1.default.error('Add operation cannot be performed due to user errors:', ...this.userErrors);
                throw new Error('Add operation cannot be performed due to user errors.');
            }
            const transactionFn = transactions_1.addTransactionFn.bind(this, data);
            return this.queue.enqueue(transactionFn, `[add]: ${this.collectionName}`);
        });
    }
    update(docUpdates) {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionFn = transactions_1.updateTransactionFn.bind(this, docUpdates);
            return this.queue.enqueue(transactionFn, `[update]: ${this.collectionName}`);
        });
    }
    set(newDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionFn = transactions_1.setTransactionFn.bind(this, newDocument);
            return this.queue.enqueue(transactionFn, `[set]: ${this.collectionName}`);
        });
    }
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionFn = transactions_1.deleteTransactionFn.bind(this);
            return this.queue.enqueue(transactionFn, `[delete]: ${this.collectionName}`);
        });
    }
}
exports.default = InxDB;
