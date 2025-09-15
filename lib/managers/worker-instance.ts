import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { Logger } from '@nestjs/common';
import { WORKER_MESSAGE_TIMEOUT } from '../constants/worker.constants';
import type {
  WorkerExecutionContext,
  WorkerInstanceInfo,
  WorkerMessage,
} from '../interfaces/worker.interface';

export class WorkerInstance {
  private readonly logger = new Logger(WorkerInstance.name);
  private readonly worker: Worker;
  private readonly pendingMessages = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
      context: WorkerExecutionContext;
    }
  >();

  private _status: 'idle' | 'busy' | 'error' | 'terminated' = 'idle';
  private _createdAt = new Date();
  private _lastUsed = new Date();
  private _executionCount = 0;
  private _errorCount = 0;
  private _restartCount = 0;

  constructor(
    private readonly id: string,
    readonly workerScript: string,
    readonly workerData: Record<string, unknown> = {},
  ) {
    this.worker = new Worker(workerScript, {
      workerData: { ...workerData, workerId: this.id },
    });

    this.setupWorkerListeners();
  }

  private setupWorkerListeners(): void {
    this.worker.on('message', (message: WorkerMessage) => {
      this.handleWorkerMessage(message);
    });

    this.worker.on('error', (error: Error) => {
      this.logger.error(`Worker ${this.id} error:`, error);
      this._status = 'error';
      this._errorCount++;
      this.rejectAllPendingMessages(error);
    });

    this.worker.on('exit', (code: number) => {
      this.logger.warn(`Worker ${this.id} exited with code ${code}`);
      this._status = 'terminated';
      this.rejectAllPendingMessages(new Error(`Worker exited with code ${code}`));
    });
  }

  private handleWorkerMessage(message: WorkerMessage): void {
    const pending = this.pendingMessages.get(message.id);
    if (!pending) {
      this.logger.warn(`Received message for unknown request: ${message.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingMessages.delete(message.id);

    if (message.type === 'result') {
      this._status = 'idle';
      this._executionCount++;
      this._lastUsed = new Date();
      pending.resolve(message.result);
    } else if (message.type === 'error') {
      this._status = 'idle';
      this._errorCount++;
      const error = new Error(message.error?.message || 'Worker execution failed');
      error.name = message.error?.name || 'WorkerError';
      error.stack = message.error?.stack;
      pending.reject(error);
    }
  }

  private rejectAllPendingMessages(error: Error): void {
    for (const [_id, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingMessages.clear();
  }

  async execute(
    method: string,
    args: unknown[],
    timeout: number = WORKER_MESSAGE_TIMEOUT,
  ): Promise<unknown> {
    if (this._status === 'terminated' || this._status === 'error') {
      throw new Error(`Worker ${this.id} is not available (status: ${this._status})`);
    }

    const messageId = randomUUID();
    const message: WorkerMessage = {
      id: messageId,
      type: 'execute',
      method,
      args,
      timestamp: Date.now(),
    };

    const context: WorkerExecutionContext = {
      workerId: this.id,
      method,
      args,
      timeout,
      retries: 0,
      attempt: 1,
      startTime: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        this._status = 'error';
        reject(new Error(`Worker execution timeout after ${timeout}ms`));
      }, timeout);

      this.pendingMessages.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        context,
      });

      this._status = 'busy';
      this.worker.postMessage(message);
    });
  }

  async ping(): Promise<boolean> {
    try {
      const messageId = randomUUID();
      const message: WorkerMessage = {
        id: messageId,
        type: 'ping',
        timestamp: Date.now(),
      };

      return new Promise((resolve) => {
        const timeoutHandle = setTimeout(() => {
          this.pendingMessages.delete(messageId);
          resolve(false);
        }, 5000);

        this.pendingMessages.set(messageId, {
          resolve: () => {
            clearTimeout(timeoutHandle);
            resolve(true);
          },
          reject: () => {
            clearTimeout(timeoutHandle);
            resolve(false);
          },
          timeout: timeoutHandle,
          context: {
            workerId: this.id,
            method: 'ping',
            args: [],
            timeout: 5000,
            retries: 0,
            attempt: 1,
            startTime: Date.now(),
          },
        });

        this.worker.postMessage(message);
      });
    } catch {
      return false;
    }
  }

  async terminate(): Promise<void> {
    this.rejectAllPendingMessages(new Error('Worker is being terminated'));
    await this.worker.terminate();
    this._status = 'terminated';
  }

  get info(): WorkerInstanceInfo {
    return {
      id: this.id,
      status: this._status,
      createdAt: this._createdAt,
      lastUsed: this._lastUsed,
      executionCount: this._executionCount,
      errorCount: this._errorCount,
      restartCount: this._restartCount,
    };
  }

  get isAvailable(): boolean {
    return this._status === 'idle';
  }

  get isBusy(): boolean {
    return this._status === 'busy';
  }

  get isHealthy(): boolean {
    return this._status !== 'error' && this._status !== 'terminated';
  }

  incrementRestartCount(): void {
    this._restartCount++;
  }
}
