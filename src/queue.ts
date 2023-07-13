export default class TransactionQueue implements ITransactionQueue {
	private queue: TransactionFunction[]; // Queue to hold transaction functions
	private isProcessing: boolean; // Flag to track if the queue is currently being processed

	constructor() {
		this.queue = [];
		this.isProcessing = false;
	}

	public enqueue(transactionFn: TransactionFunction): void {
		this.queue.push(transactionFn);
		this.processQueue();
	}

	private processQueue(): void {
		if (this.isProcessing) {
			return; // If queue is already being processed, exit
		}
		const processNext = (): void => {
			if (this.queue.length === 0) {
				this.isProcessing = false;
				return;
			}

			const transactionFn = this.queue.shift();
			if (transactionFn) {
				this.isProcessing = true;
				transactionFn();
				processNext();
			}
		};

		processNext();
	}
}

type TransactionFunction = () => void;

interface ITransactionQueue {
  enqueue(transactionFn: TransactionFunction): void;
}
