/**
 * IndexedDB wrapper for handling offline database operations.
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export default class InxDB implements IInxDB {
    private dbName;
    private db;
    private isOpen;
    private collectionName;
    private collectionSelected;
    private docSelectionCriteria;
    private userErrors;
    private queue;
    constructor(dbName: string);
    static isDebugMode(): boolean;
    static setDebugMode(active: boolean): void;
    getCollectionName(): string | null;
    isCollectionSelected(): boolean;
    getDocSelectionCriteria(): string | object | null;
    resetDocSelectionCriteria(): void;
    private resetErrors;
    collection(collectionName: string): InxDB;
    doc(docSelectionCriteria: string | object): InxDB;
    get<TData>(options?: {
        keys: boolean;
    }): Promise<TData[]>;
    add<TData>(data: TData & {
        id?: string | number;
    }): Promise<TData>;
    update<TData>(docUpdates: Partial<TData>): Promise<TData>;
    set<TData>(newDocument: (TData & {
        id?: string | number;
    })[]): Promise<void>;
    delete(): Promise<void>;
}
export interface IInxDB {
    collection(collectionName: string): InxDB;
    doc(docSelectionCriteria: string | object): InxDB;
    get<TData>(options?: {
        keys?: boolean;
    }): Promise<TData[]>;
    add<TData>(data: TData & {
        id?: string | number;
    }): Promise<TData>;
    update<TData>(docUpdates: TData): Promise<TData>;
    set<TData>(newDocument: (TData & {
        id?: string | number;
    })[]): Promise<void>;
    delete(): Promise<void>;
}
