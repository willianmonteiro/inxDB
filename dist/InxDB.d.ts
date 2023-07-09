/**
 * IndexedDB wrapper for handling offline database operations.
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export default class InxDB implements IInxDB {
    private dbName;
    private db;
    private collectionName;
    private collectionSelected;
    private docSelectionCriteria;
    private userErrors;
    constructor(dbName: string);
    private initializeDB;
    private getObjectStore;
    private resetErrors;
    collection(collectionName: string): InxDB;
    doc(docSelectionCriteria: string | object): InxDB;
    get<TData>(options?: {
        keys: boolean;
    }): Promise<TData[]>;
    add<TData>(data: TData & {
        id: number;
    }, key?: string): Promise<TData>;
    update<TData>(docUpdates: TData): Promise<TData>;
    set<TData>(newDocument: (TData & {
        id: number;
        _key?: string;
    })[], options?: {
        keys: boolean;
    }): Promise<void>;
    delete(): Promise<void>;
}
export interface IInxDB {
    collection(collectionName: string): InxDB;
    doc(docSelectionCriteria: string | object): InxDB;
    get<TData>(options?: {
        keys?: boolean;
    }): Promise<TData[]>;
    add<TData>(data: TData, key?: string): Promise<TData>;
    update<TData>(docUpdates: TData): Promise<TData>;
    set<TData>(newDocument: (TData & {
        id: number;
        _key?: string;
    })[], options?: {
        keys?: boolean;
    }): Promise<void>;
    delete(): Promise<void>;
}
