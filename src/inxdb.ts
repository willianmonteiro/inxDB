/* eslint-disable max-lines */

import { getCollection } from './collection';
import { CollectionNotSpecifiedError, CollectionNotFoundError, DocumentCriteriaError } from './errors';
import { initializeDB } from './initialization';
import logger from './utils/logger';

/**
 * IndexedDB wrapper for handling offline database operations.
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export default class InxDB implements IInxDB {
	private dbName: string;

	private db: IDBDatabase | null;

	private collectionName: string | null;

	private collectionSelected: boolean;

	private docSelectionCriteria: string | object | null;

	private userErrors: string[];

	constructor(dbName: string) {
		this.dbName = dbName;
		this.db = null;
		this.collectionName = null;
		this.collectionSelected = false;
		this.docSelectionCriteria = null;
		this.userErrors = [];

		this.collection = this.collection.bind(this);
		this.doc = this.doc.bind(this);
		this.get = this.get.bind(this);
		this.add = this.add.bind(this);
		this.update = this.update.bind(this);
		this.set = this.set.bind(this);
		this.delete = this.delete.bind(this);

		this.initializeDB();
	}

	private initializeDB(): void {
		initializeDB(this);
	}

	private getObjectStore(collectionName: string, mode: IDBTransactionMode = 'readwrite'): IDBObjectStore | null {
		return getCollection(this, collectionName, mode);
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
		return new Promise((resolve, reject) => {
			if (!this.collectionName) {
				reject(new CollectionNotSpecifiedError());
				return;
			}

			const objectStore: IDBObjectStore | null = this.getObjectStore(this.collectionName, 'readonly');
			if (!objectStore) {
				reject(new CollectionNotFoundError());
				return;
			}

			let request: IDBRequest;
			if (this.docSelectionCriteria) {
				request = objectStore.get(this.docSelectionCriteria as IDBValidKey);
			} else {
				request = objectStore.getAll();
			}

			request.onsuccess = () => {
				const result: any[] = options.keys ? request.result.map((data: any) => ({ key: data.key, data })) : request.result;
				resolve(result);
			};

			request.onerror = (event: Event) => {
				reject((event.target as IDBRequest).error);
			};
		});
	}

	public async add<TData>(data: TData & { id: number }, key?: string): Promise<TData> {
		return new Promise((resolve, reject) => {
			if (!this.collectionName) {
				reject(new CollectionNotSpecifiedError());
				return;
			}

			const objectStore: IDBObjectStore | null = this.getObjectStore(this.collectionName);
			if (!objectStore) {
				reject(new CollectionNotFoundError());
				return;
			}

			// Check if there are any user errors
			if (this.userErrors.length) {
				logger.error('Add operation cannot be performed due to user errors:', ...this.userErrors);
				reject(new Error('Add operation cannot be performed due to user errors.'));
				return;
			}

			const getRequest: IDBRequest | null = key ? objectStore.get(key) : objectStore.get(data?.id);

			getRequest?.addEventListener('success', (event: Event) => {
				const existingData: object | undefined = (event.target as IDBRequest).result;
				if (existingData) {
					// Key already exists, update the existing object
					const updateRequest: IDBRequest = objectStore.put(data);

					updateRequest.onsuccess = () => {
						resolve(data);
					};

					updateRequest.onerror = (_event: Event) => {
						reject((_event.target as IDBRequest).error);
					};
				} else {
					// Key doesn't exist, add the new object
					const addRequest: IDBRequest<IDBValidKey> = objectStore.add(data, key);

					addRequest.onsuccess = () => {
						resolve(data);
					};

					addRequest.onerror = (_event: Event) => {
						reject((_event.target as IDBRequest).error);
					};
				}
			});

			getRequest?.addEventListener('error', (event: Event) => {
				reject((event.target as IDBRequest).error);
			});
		});
	}

	public async update<TData>(docUpdates: TData): Promise<TData> {
		return new Promise((resolve, reject) => {
			if (!this.collectionName) {
				reject(new CollectionNotSpecifiedError());
				return;
			}
  
			if (!this.docSelectionCriteria) {
				reject(new DocumentCriteriaError());
				return;
			}
  
			const objectStore: IDBObjectStore | null = this.getObjectStore(this.collectionName);
  
			if (!objectStore) {
				reject(new CollectionNotFoundError(this.collectionName));
				return;
			}
  
			const request: IDBRequest = objectStore.getAllKeys();
			const updates: Promise<void>[] = [];
  
			request.onsuccess = () => {
				const keys: any[] = request.result;
  
				keys.forEach((key: any) => {
					const getRequest: IDBRequest = objectStore.get(key);
					let updateRequest: IDBRequest;
  
					getRequest.onsuccess = () => {
						const document: TData = getRequest.result;
  
						const updatedDocument: TData = { ...document, ...docUpdates };
						updateRequest = objectStore.put(updatedDocument, key);
  
						updateRequest.onerror = (event: Event) => {
							reject((event.target as IDBRequest).error);
						};
					};
  
					getRequest.onerror = (event: Event) => {
						reject((event.target as IDBRequest).error);
					};
  
					updates.push(new Promise((innerResolve, innerReject) => {
						updateRequest.onsuccess = () => {
							innerResolve();
						};
  
						updateRequest.onerror = (event: Event) => {
							innerReject((event.target as IDBRequest).error);
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
  
			request.onerror = (event: Event) => {
				reject((event.target as IDBRequest).error);
			};
		});
	}

	public async set<TData>(newDocument: (TData & { id: number, _key?: string })[], options = { keys: false }): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.collectionName) {
				reject(new CollectionNotSpecifiedError());
				return;
			}

			const objectStore: IDBObjectStore | null = this.getObjectStore(this.collectionName);
			if (!objectStore) {
				reject(new CollectionNotFoundError(this.collectionName));
				return;
			}

			const clearRequest: IDBRequest = objectStore.clear();

			clearRequest.onsuccess = () => {
				if (options.keys) {
					newDocument.forEach((doc: any) => {
						const key: string = doc._key;
						delete doc._key;
						objectStore.add(doc, key);
					});
				} else {
					newDocument.forEach((doc: any) => {
						objectStore.add(doc);
					});
				}

				resolve();
			};

			clearRequest.onerror = (event: Event) => {
				reject((event.target as IDBRequest).error);
			};
		});
	}

	public async delete(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.collectionName) {
				reject(new CollectionNotSpecifiedError());
				return;
			}

			if (!this.docSelectionCriteria) {
				reject(new DocumentCriteriaError());
				return;
			}

			const objectStore: IDBObjectStore | null = this.getObjectStore(this.collectionName, 'readwrite');
			if (!objectStore) {
				reject(new CollectionNotFoundError(this.collectionName));
				return;
			}

			const request: IDBRequest = objectStore.delete(this.docSelectionCriteria as IDBValidKey);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = (event: Event) => {
				reject((event.target as IDBRequest).error);
			};
		});
	}
}

export interface IInxDB {
  collection(collectionName: string): InxDB;
  doc(docSelectionCriteria: string | object): InxDB;
  get<TData>(options?: { keys?: boolean }): Promise<TData[]>;
  add<TData>(data: TData, key?: string): Promise<TData>;
  update<TData>(docUpdates: TData): Promise<TData>;
  set<TData>(newDocument: (TData & { id: number, _key?: string })[], options?: { keys?: boolean }): Promise<void>;
  delete(): Promise<void>;
}