export function isValidPrimitiveCriteria(criteria: any): boolean {
	return criteria !== null && ['string', 'number'].includes(typeof criteria);
}