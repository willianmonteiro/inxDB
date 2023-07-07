/* eslint-disable no-console */
const logger = {
	baseStyle: `
    padding: 2px 5px;
    background-color: #124F5C;
    border-radius: 4px;
    color: white;
  `,
	colors: {
		log: '#124F5C',
		error: '#ed2939',
		warn: '#f39c12'
	},
	log(...messages: (string | DOMException | null)[]) {
		const style = `${logger.baseStyle} background-color: ${logger.colors.log}`;
		console.log('%cInxDB', style, ...messages);
	},
	error(...messages: (string | DOMException | null)[]) {
		const style = `${logger.baseStyle} background-color: ${logger.colors.error}`;
		console.error('%cInxDB', style, ...messages);
	},
	warn(...messages: (string | DOMException | null)[]) {
		const style = `${logger.baseStyle} background-color: ${logger.colors.warn}`;
		console.warn('%cInxDB', style, ...messages);
	}
};

export default logger;
