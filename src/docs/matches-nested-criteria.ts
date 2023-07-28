export function matchesNestedCriteria(doc: any, criteria: any): boolean {
	return Object.entries(criteria).every(([key, value]) => {
		if (typeof value === 'object' && value !== null) {
			if (key in doc) {
				return matchesNestedCriteria(doc[key], value);
			} else {
				return false; // Property not found in the object
			}
		} else {
			return value !== null && doc?.[key] && doc[key] === value;
		}
	});
}