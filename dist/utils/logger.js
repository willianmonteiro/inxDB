"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const baseStyle = `
  padding: 2px 5px;
  background-color: #124F5C;
  border-radius: 4px;
  color: white;
`;
const colors = {
    log: '#124F5C',
    error: '#ed2939',
    warn: '#f39c12'
};
class Logger {
    static setDebugMode(value) {
        Logger.debugMode = value;
    }
    static log(...args) {
        if (!Logger.debugMode)
            return;
        const style = `${baseStyle} background-color: ${colors.log}`;
        console.log('%cInxDB', style, ...args);
    }
    static error(...args) {
        if (!Logger.debugMode)
            return;
        const style = `${baseStyle} background-color: ${colors.error}`;
        console.error('%cInxDB', style, ...args);
    }
    static warn(...args) {
        if (!Logger.debugMode)
            return;
        const style = `${baseStyle} background-color: ${colors.warn}`;
        console.warn('%cInxDB', style, ...args);
    }
}
Logger.debugMode = false;
exports.default = Logger;
