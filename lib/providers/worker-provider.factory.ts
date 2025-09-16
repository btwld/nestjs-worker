import { Logger, type Provider, type Type } from "@nestjs/common";
import { WORKER_INJECT_TOKEN } from "../constants/worker.constants";
import { WorkerManager } from "../managers/worker-manager";
import { WorkerProxy } from "../proxy/worker-proxy";

export class WorkerProviderFactory {
  private static readonly logger = new Logger(WorkerProviderFactory.name);

  /**
   * Create a provider for a worker class
   */
  static createWorkerProvider(workerClass: Type<unknown>): Provider {
    const token = `${WORKER_INJECT_TOKEN.toString()}_${workerClass.name}`;

    return {
      provide: token,
      useFactory: (workerManager: WorkerManager) => {
        const proxy = new WorkerProxy(workerClass, workerManager);
        return proxy.createProxy();
      },
      inject: [WorkerManager],
    };
  }

  /**
   * Create providers for multiple worker classes
   */
  static createWorkerProviders(workerClasses: Type<unknown>[]): Provider[] {
    return workerClasses.map((workerClass) =>
      WorkerProviderFactory.createWorkerProvider(workerClass)
    );
  }

  /**
   * Create a dynamic provider for a worker class
   * This is useful when the worker class is determined at runtime
   */
  static createDynamicWorkerProvider(
    token: string,
    workerClass: Type<unknown>
  ): Provider {
    return {
      provide: token,
      useFactory: (workerManager: WorkerManager) => {
        const proxy = new WorkerProxy(workerClass, workerManager);
        return proxy.createProxy();
      },
      inject: [WorkerManager],
    };
  }

  /**
   * Get the injection token for a worker class
   */
  static getWorkerToken(workerClass: Type<unknown>): string {
    return `${WORKER_INJECT_TOKEN.toString()}_${workerClass.name}`;
  }

  /**
   * Create a factory provider that can create worker proxies on demand
   */
  static createWorkerFactory(): Provider {
    return {
      provide: "WORKER_FACTORY",
      useFactory: (workerManager: WorkerManager) => {
        return (workerClass: Type<unknown>) => {
          const proxy = new WorkerProxy(workerClass, workerManager);
          return proxy.createProxy();
        };
      },
      inject: [WorkerManager],
    };
  }
}
