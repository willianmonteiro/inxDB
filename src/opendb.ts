import logger from './utils/logger';
import InxDB from './inxdb';

let isDbOpening = false; // Add this flag to prevent multiple openings at once

export async function connectToDatabase(instance: InxDB): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		if (instance['isOpen']) {
			resolve(); // Database is already open with the desired version
		} else {
			if (isDbOpening) {
				// Database is already in the process of opening, wait for it to open
				const checkIfDbOpen = () => {
					if (instance['isOpen']) {
						resolve();
					} else {
						setTimeout(checkIfDbOpen, 100); // Check again after a short delay
					}
				};
				checkIfDbOpen();
			} else {
				isDbOpening = true; // Mark that the database is currently being opened

				logger.log('Database connection is not open or version does not match. Reopening...');

				if (instance['db']) {
					instance['db'].close(); // Close the existing database
					instance['isOpen'] = false;
				}

				const request: IDBOpenDBRequest = indexedDB.open(instance['dbName']);

				request.onblocked = () => {
					const error = 'IndexedDB is blocked. Please close other instances or tabs using the database.';
					logger.error(error);
					reject(new Error(error));
				};

				request.onerror = (event: Event) => {
					logger.error('Failed to open IndexedDB:' + (event.target as IDBRequest).error);
					reject((event.target as IDBRequest).error);
				};

				request.onsuccess = () => {
					instance['db'] = request.result;
					instance['isOpen'] = true;

					instance['db'].onclose = () => {
						logger.warn('Database connection is closing.');
						instance['isOpen'] = false;
					};
					instance['db'].onversionchange = () => {
						logger.warn('Database version change detected.');
						if (instance['db']) {
							instance['db'].close(); // Close the connection if a version change is detected
							instance['isOpen'] = false;
						}
					};
					instance['db'].onerror = (event: Event) => {
						logger.error('Database error detected:' + (event.target as IDBRequest).error);
						if (instance['db']) {
							instance['db'].close(); // Close the connection if an error is detected
							instance['isOpen'] = false;
						}
					};

					isDbOpening = false; // Reset the opening flag
					resolve();
				};

				// request.onupgradeneeded = (event: IDBVersionChangeEvent) => {};
			}
		}
	});
}


