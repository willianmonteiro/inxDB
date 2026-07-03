/* eslint-disable no-console */
const baseStyle = 'padding: 2px 5px; border-radius: 4px; color: white;';

const colors = {
	log: '#124F5C',
	error: '#ed2939',
	warn: '#f39c12',
};

export default class Logger {
	static debugMode = false;

	static setDebugMode(value: boolean): void {
		Logger.debugMode = value;
	}

	static log(...args: unknown[]): void {
		if (!Logger.debugMode) return;
		console.log('%cInxDB', `${baseStyle} background-color: ${colors.log}`, ...args);
	}

	static warn(...args: unknown[]): void {
		if (!Logger.debugMode) return;
		console.warn('%cInxDB', `${baseStyle} background-color: ${colors.warn}`, ...args);
	}

	static error(...args: unknown[]): void {
		if (!Logger.debugMode) return;
		console.error('%cInxDB', `${baseStyle} background-color: ${colors.error}`, ...args);
	}
}
