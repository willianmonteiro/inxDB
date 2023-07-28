export function isObjectCriteria(criteria: any): boolean {
	return typeof criteria === 'object' && criteria !== null;
}