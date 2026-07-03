import { DocumentKey } from './types';

export function isDocumentKey(value: unknown): value is DocumentKey {
	return typeof value === 'string' || typeof value === 'number';
}

export function isValidCriteria(value: unknown): value is Record<string, unknown> {
	return isPlainObject(value) && Object.keys(value).length > 0;
}

export function matchesCriteria(document: unknown, criteria: Record<string, unknown>): boolean {
	return Object.entries(criteria).every(([key, expected]) => {
		if (!isPlainObject(document) || !(key in document)) return false;
		const actual = document[key];
		if (isPlainObject(expected)) return matchesCriteria(actual, expected);
		return actual === expected;
	});
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
