import Logger from '../utils/logger';

export function matchesNestedCriteria(doc: any, criteria: any): boolean {	return Object.entries(criteria).every(([key, value]) => {
	if (typeof value === 'object' && value !== null) {
		if (key in doc) {
			const result = matchesNestedCriteria(doc[key], value);
			Logger.log(`Comparing ${key}: doc[${key}] = ${doc[key]}, value = ${JSON.stringify(value)}, Result: ${result}`);
			return result;
		} else {
			Logger.log(`Property "${key}" not found in the object: `, doc);
			return false; // Property not found in the object
		}
	} else {
		const result = value !== null && doc?.[key] && doc[key] === value;
		Logger.log(`Comparing ${key}: doc[${key}] = ${doc[key]}, value = ${value}, Result: ${result}`);
		return result;
	}
});
}