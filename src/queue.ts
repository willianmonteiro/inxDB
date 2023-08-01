import Logger from './utils/logger';

export default class TransactionQueue {
	private queue: ITransactionFunctionQueue<any>[] = [];
	private isProcessing = false;

	public enqueue<T>(transactionFn: () => Promise<T>, transactionKey?: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue.push({
				transactionFn,
				resolve,
				reject,
				transactionKey,
			});

			if (!this.isProcessing) {
				this.processQueue();
			}
		});
	}

	private async processQueue(): Promise<void> {
		if (this.queue.length === 0) {
			this.isProcessing = false;
			return;
		}

		this.isProcessing = true;
		const nextTransaction = this.queue.shift()!;
		try {
			Logger.log(`[TransactionQueue]: Processing transaction with key "${nextTransaction.transactionKey}"`);
			const result = await nextTransaction.transactionFn();
			nextTransaction.resolve(result);
			Logger.log(`[TransactionQueue]: Transaction with key "${nextTransaction.transactionKey}" completed successfully.`);
		} catch (error) {
			nextTransaction.reject(error);
			Logger.error(`[TransactionQueue]: Error in transaction with key "${nextTransaction.transactionKey}": ${error}`);
		}

		this.processQueue();
	}
}

export interface ITransactionFunctionQueue<T> {
  transactionFn: TTransactionFunction<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  transactionKey?: string;
}

export type TTransactionFunction<T> = () => Promise<T>;