import logger from './utils/logger';

export default class TransactionQueue implements ITransactionQueue {
	private queue: TransactionFunction[]; // Queue to hold transaction functions
	private isProcessing: boolean; // Flag to track if the queue is currently being processed

	constructor() {
		this.queue = [];
		this.isProcessing = false;
	}

	public async enqueue(transactionFn: TransactionFunction): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			const wrappedTransactionFn = async () => {
				try {
					await transactionFn();
					resolve();
				} catch (error) {
					reject(error);
				}
				this.processQueue(); // Start processing the next transaction after the current one is done
			};

			this.queue.push(wrappedTransactionFn);

			if (!this.isProcessing) {
				this.processQueue();
			}
		});
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;

		try {
			while (this.queue.length > 0) {
				const transactionFn = this.queue.shift();
				if (transactionFn) {
					await transactionFn();
				}
			}
		} catch (error) {
			logger.error('[queue]: Error while executing operation:' + error);
		} finally {
			this.isProcessing = false;
		}
	}
}

type TransactionFunction = () => void;

interface ITransactionQueue {
  enqueue(transactionFn: TransactionFunction): void;
}
