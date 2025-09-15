import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type Type,
} from "@nestjs/common";
import type {
  WorkerMetadata,
  WorkerMethodOptions,
  WorkerPoolInfo,
} from "../interfaces/worker.interface";
import { WorkerPool } from "./worker-pool";

@Injectable()
export class WorkerManager implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerManager.name);
  private readonly workerPools = new Map<Type<unknown>, WorkerPool>();
  private readonly workerMetadata = new Map<Type<unknown>, WorkerMetadata>();

  /**
   * Register a worker class with its metadata
   */
  registerWorker(metadata: WorkerMetadata): void {
    this.logger.log(`Registering worker: ${metadata.target.name}`);
    this.workerMetadata.set(metadata.target, metadata);
  }

  /**
   * Initialize a worker pool for a registered worker class
   */
  async initializeWorkerPool(workerClass: Type<unknown>): Promise<void> {
    if (this.workerPools.has(workerClass)) {
      this.logger.warn(`Worker pool for ${workerClass.name} already exists`);
      return;
    }

    const metadata = this.workerMetadata.get(workerClass);
    if (!metadata) {
      throw new Error(`Worker metadata not found for ${workerClass.name}`);
    }

    try {
      const pool = new WorkerPool(workerClass, metadata.options);
      this.workerPools.set(workerClass, pool);
      this.logger.log(`Initialized worker pool for ${workerClass.name}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize worker pool for ${workerClass.name}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Execute a method on a worker
   */
  async executeWorkerMethod(
    workerClass: Type<unknown>,
    method: string,
    args: unknown[],
    methodOptions?: WorkerMethodOptions
  ): Promise<unknown> {
    const pool = this.workerPools.get(workerClass);
    if (!pool) {
      throw new Error(`Worker pool not found for ${workerClass.name}`);
    }

    const metadata = this.workerMetadata.get(workerClass);
    if (!metadata) {
      throw new Error(`Worker metadata not found for ${workerClass.name}`);
    }

    const methodMetadata = metadata.methods.get(method);
    if (!methodMetadata) {
      throw new Error(
        `Method ${method} not found in worker ${workerClass.name}`
      );
    }

    const finalOptions = { ...methodMetadata, ...methodOptions };

    try {
      return await pool.execute(method, args, finalOptions);
    } catch (error) {
      this.logger.error(
        `Worker execution failed for ${workerClass.name}.${method}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get information about a worker pool
   */
  getWorkerPoolInfo(workerClass: Type<unknown>): WorkerPoolInfo | null {
    const pool = this.workerPools.get(workerClass);
    return pool ? pool.info : null;
  }

  /**
   * Get information about all worker pools
   */
  getAllWorkerPoolsInfo(): WorkerPoolInfo[] {
    return Array.from(this.workerPools.values()).map((pool) => pool.info);
  }

  /**
   * Get registered worker metadata
   */
  getWorkerMetadata(workerClass: Type<unknown>): WorkerMetadata | null {
    return this.workerMetadata.get(workerClass) || null;
  }

  /**
   * Get all registered worker classes
   */
  getRegisteredWorkers(): Type<unknown>[] {
    return Array.from(this.workerMetadata.keys());
  }

  /**
   * Check if a worker class is registered
   */
  isWorkerRegistered(workerClass: Type<unknown>): boolean {
    return this.workerMetadata.has(workerClass);
  }

  /**
   * Check if a worker pool is initialized
   */
  isWorkerPoolInitialized(workerClass: Type<unknown>): boolean {
    return this.workerPools.has(workerClass);
  }

  /**
   * Initialize all registered worker pools
   */
  async initializeAllWorkerPools(): Promise<void> {
    const initPromises = Array.from(this.workerMetadata.keys()).map(
      async (workerClass) => {
        try {
          await this.initializeWorkerPool(workerClass);
        } catch (error) {
          this.logger.error(
            `Failed to initialize worker pool for ${workerClass.name}:`,
            error
          );
        }
      }
    );

    await Promise.all(initPromises);
    this.logger.log(`Initialized ${this.workerPools.size} worker pools`);
  }

  /**
   * Shutdown a specific worker pool
   */
  async shutdownWorkerPool(workerClass: Type<unknown>): Promise<void> {
    const pool = this.workerPools.get(workerClass);
    if (pool) {
      await pool.shutdown();
      this.workerPools.delete(workerClass);
      this.logger.log(`Shutdown worker pool for ${workerClass.name}`);
    }
  }

  /**
   * Shutdown all worker pools
   */
  async shutdownAllWorkerPools(): Promise<void> {
    this.logger.log("Shutting down all worker pools...");

    const shutdownPromises = Array.from(this.workerPools.entries()).map(
      async ([workerClass, pool]) => {
        try {
          await pool.shutdown();
          this.logger.log(`Shutdown worker pool for ${workerClass.name}`);
        } catch (error) {
          this.logger.error(
            `Error shutting down worker pool for ${workerClass.name}:`,
            error
          );
        }
      }
    );

    await Promise.all(shutdownPromises);
    this.workerPools.clear();
    this.logger.log("All worker pools shutdown complete");
  }

  /**
   * Get worker pool statistics
   */
  getStatistics(): {
    totalPools: number;
    totalInstances: number;
    totalExecutions: number;
    totalErrors: number;
    averageExecutionTime: number;
  } {
    const pools = Array.from(this.workerPools.values());

    return {
      totalPools: pools.length,
      totalInstances: pools.reduce((sum, pool) => sum + pool.instanceCount, 0),
      totalExecutions: pools.reduce(
        (sum, pool) => sum + pool.info.totalExecutions,
        0
      ),
      totalErrors: pools.reduce((sum, pool) => sum + pool.info.totalErrors, 0),
      averageExecutionTime:
        pools.length > 0
          ? pools.reduce(
              (sum, pool) => sum + pool.info.averageExecutionTime,
              0
            ) / pools.length
          : 0,
    };
  }

  /**
   * Module cleanup
   */
  async onModuleDestroy(): Promise<void> {
    await this.shutdownAllWorkerPools();
  }
}
