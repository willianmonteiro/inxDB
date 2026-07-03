export type DocumentKey = string | number;

export interface DocumentData {
	id?: DocumentKey;
}

/** Loosely-typed document shape used when no document type is given. */
export type AnyDocument = DocumentData & Record<string, unknown>;

export type WithId<T> = T & { id: DocumentKey };

/**
 * Subset of document fields compared with strict equality.
 * Nested objects may be matched partially by nesting criteria.
 */
export type Criteria<T> = {
	[K in keyof T]?: NonNullable<T[K]> extends object
		? Criteria<NonNullable<T[K]>> | T[K]
		: T[K];
};

export type DocumentSelector<T> = DocumentKey | Criteria<T>;
