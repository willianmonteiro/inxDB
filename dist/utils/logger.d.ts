declare const logger: {
    baseStyle: string;
    colors: {
        log: string;
        error: string;
        warn: string;
    };
    log(...messages: (string | DOMException | null)[]): void;
    error(...messages: (string | DOMException | null)[]): void;
    warn(...messages: (string | DOMException | null)[]): void;
};
export default logger;
