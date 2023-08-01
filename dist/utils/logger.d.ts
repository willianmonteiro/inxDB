export default class Logger {
    static debugMode: boolean;
    static setDebugMode(value: boolean): void;
    static log(...args: (string | DOMException | null)[]): void;
    static error(...args: (string | DOMException | null)[]): void;
    static warn(...args: (string | DOMException | null)[]): void;
}
