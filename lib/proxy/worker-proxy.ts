import { Logger, type Type } from "@nestjs/common";
import { getWorkerMetadata, getWorkerMethods } from "../decorators";
import type { WorkerMethodOptions } from "../interfaces/worker.interface";
import type { WorkerManager } from "../managers/worker-manager";

/**
 * Creates a proxy for a worker class that intercepts method calls
 * and routes them to worker threads
 */
export class WorkerProxy {
  private readonly logger = new Logger(WorkerProxy.name);

  constructor(
    private readonly workerClass: Type<unknown>,
    private readonly workerManager: WorkerManager
  ) {}

  /**
   * Create a proxy instance for the worker class
   */
  createProxy(): Record<string, unknown> {
    const metadata = getWorkerMetadata(this.workerClass);
    if (!metadata) {
      throw new Error(`Worker metadata not found for ${this.workerClass.name}`);
    }

    const workerMethods = getWorkerMethods(this.workerClass);
    const proxy = {};

    for (const methodName of workerMethods) {
      const methodOptions = metadata.methods.get(methodName);
      if (methodOptions) {
        (proxy as any)[methodName] = this.createProxyMethod(
          methodName,
          methodOptions
        );
      }
    }

    (proxy as any).__getWorkerInfo = () =>
      this.workerManager.getWorkerPoolInfo(this.workerClass);
    (proxy as any).__getWorkerClass = () => this.workerClass;
    (proxy as any).__isWorkerProxy = true;

    return proxy;
  }

  /**
   * Create a proxy method that routes calls to worker threads
   */
  private createProxyMethod(
    methodName: string,
    methodOptions: WorkerMethodOptions
  ) {
    return async (...args: unknown[]) => {
      try {
        this.logger.debug(
          `Executing worker method ${this.workerClass.name}.${methodName}`
        );

        const result = await this.workerManager.executeWorkerMethod(
          this.workerClass,
          methodName,
          args,
          methodOptions
        );

        this.logger.debug(
          `Worker method ${this.workerClass.name}.${methodName} completed`
        );
        return result;
      } catch (error) {
        this.logger.error(
          `Worker method ${this.workerClass.name}.${methodName} failed:`,
          error
        );
        throw error;
      }
    };
  }

  /**
   * Check if an object is a worker proxy
   */
  static isWorkerProxy(obj: unknown): boolean {
    return (
      obj &&
      typeof obj === "object" &&
      (obj as Record<string, unknown>).__isWorkerProxy === true
    );
  }

  /**
   * Get the worker class from a proxy
   */
  static getWorkerClass(proxy: unknown): Type<unknown> | null {
    const proxyObj = proxy as Record<string, unknown>;
    return proxy &&
      typeof proxy === "object" &&
      proxyObj.__getWorkerClass &&
      typeof proxyObj.__getWorkerClass === "function"
      ? (proxyObj.__getWorkerClass as () => Type<unknown>)()
      : null;
  }

  /**
   * Get worker info from a proxy
   */
  static getWorkerInfo(proxy: unknown): unknown {
    const proxyObj = proxy as Record<string, unknown>;
    return proxy &&
      typeof proxy === "object" &&
      proxyObj.__getWorkerInfo &&
      typeof proxyObj.__getWorkerInfo === "function"
      ? (proxyObj.__getWorkerInfo as () => unknown)()
      : null;
  }
}
