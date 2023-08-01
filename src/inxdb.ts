import { addTransactionFn, deleteTransactionFn, getTransactionFn, setTransactionFn, updateTransactionFn } from './transactions';
import TransactionQueue, { TTransactionFunction } from './queue';
import Logger from './utils/logger';

/**
 * IndexedDB wrapper for handling offline database operations.
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export default class InxDB implements IInxDB {
	private dbName: string;
	private db: IDBDatabase | null;
	private isOpen: boolean;
	private collectionName: string | null;
	private collectionSelected: boolean;
	private docSelectionCriteria: string | object | null;
	private userErrors: string[];
	private queue: TransactionQueue;

	constructor(dbName: string) {
		this.dbName = dbName;
		this.db = null;
		this.isOpen = false;
		this.collectionName = null;
		this.collectionSelected = false;
		this.docSelectionCriteria = null;
		this.userErrors = [];
		this.queue = new TransactionQueue();
		this.collection = this.collection.bind(this);
		this.doc = this.doc.bind(this);
		this.get = this.get.bind(this);
		this.add = this.add.bind(this);
		this.update = this.update.bind(this);
		this.set = this.set.bind(this);
		this.delete = this.delete.bind(this);
	}

	static isDebugMode(): boolean {
		return Logger.debugMode;
	}

	static setDebugMode(active: boolean) {
		Logger.setDebugMode(active);
	}
	
	public getCollectionName(): string | null {
		return this.collectionName;
	}
	
	public isCollectionSelected(): boolean {
		return this.collectionSelected;
	}
	
	public getDocSelectionCriteria(): string | object | null {
		return this.docSelectionCriteria;
	}

	public resetDocSelectionCriteria(): void {
		this.docSelectionCriteria = null;
	}

	private resetErrors(): void {
		this.userErrors = [];
	}

	public collection(collectionName: string): InxDB {
		this.resetErrors();
		this.collectionSelected = true;
		if (!collectionName) {
			this.userErrors.push('No collection name specified in collection() method.');
			return this;
		} if (typeof collectionName !== 'string') {
			this.userErrors.push(
				'Collection name in collection() method must be a string and not an object, number, or boolean.'
			);
			return this;
		}
		this.collectionName = collectionName;
		return this;
	}

	public doc(docSelectionCriteria: string | object): InxDB {
		if (!this.collectionSelected) {
			this.userErrors.push('No collection selected. Use collection() method to select a collection first.');
		} else if (!docSelectionCriteria) {
			this.userErrors.push('No document criteria specified in doc() method. Use a string or an object.');
		} else if (typeof docSelectionCriteria !== 'string' && typeof docSelectionCriteria !== 'object') {
			this.userErrors.push('Document criteria specified in doc() method must be a string or an object.');
		} else {
			this.docSelectionCriteria = docSelectionCriteria;
		}
		return this;
	}

	public async get<TData>(options = { keys: false }): Promise<TData[]> {
		const transactionFn = getTransactionFn.bind(this, options) as TTransactionFunction<TData[]>;
		return this.queue.enqueue(transactionFn, `[get]: ${this.collectionName}`);
	}

	public async add<TData>(data: TData & { id?: string | number }): Promise<TData> {
		if (this.userErrors.length) {
			Logger.error('Add operation cannot be performed due to user errors:', ...this.userErrors);
			throw new Error('Add operation cannot be performed due to user errors.');
		}
		const transactionFn = addTransactionFn.bind(this, data) as TTransactionFunction<TData>;		
		return this.queue.enqueue(transactionFn, `[add]: ${this.collectionName}`);
	}

	public async update<TData>(docUpdates: Partial<TData>): Promise<TData> {
		const transactionFn = updateTransactionFn.bind(this, docUpdates) as TTransactionFunction<TData>;		
		return this.queue.enqueue(transactionFn, `[update]: ${this.collectionName}`);
	}

	public async set<TData>(newDocument: (TData & { id?: string | number })[]): Promise<void> {
		const transactionFn = setTransactionFn.bind(this, newDocument) as TTransactionFunction<void>;
		return this.queue.enqueue(transactionFn, `[set]: ${this.collectionName}`);
	}

	public async delete(): Promise<void> {
		const transactionFn = deleteTransactionFn.bind(this) as TTransactionFunction<void>;
		return this.queue.enqueue(transactionFn, `[delete]: ${this.collectionName}`);
	}
}

export interface IInxDB {
  collection(collectionName: string): InxDB;
  doc(docSelectionCriteria: string | object): InxDB;
  get<TData>(options?: { keys?: boolean }): Promise<TData[]>;
  add<TData>(data: TData & { id?: string | number }): Promise<TData>;
  update<TData>(docUpdates: TData): Promise<TData>;
  set<TData>(newDocument: (TData & { id?: string | number })[]): Promise<void>;
  delete(): Promise<void>;
}
