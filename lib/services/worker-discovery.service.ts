import {
  Injectable,
  Logger,
  type OnModuleInit,
  type Type,
} from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import type { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { getWorkerMetadata, isWorker } from "../decorators";
import type { WorkerMetadata } from "../interfaces/worker.interface";
import { WorkerManager } from "../managers/worker-manager";

@Injectable()
export class WorkerDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(WorkerDiscoveryService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly workerManager: WorkerManager
  ) {}

  async onModuleInit(): Promise<void> {
    await this.discoverWorkers();
    await this.initializeWorkerPools();
  }

  /**
   * Discover all worker classes in the application
   */
  private async discoverWorkers(): Promise<void> {
    this.logger.log("Discovering worker classes...");

    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();

    const allWrappers = [...providers, ...controllers];

    let discoveredCount = 0;

    for (const wrapper of allWrappers) {
      if (this.isWorkerWrapper(wrapper)) {
        await this.registerWorkerFromWrapper(wrapper);
        discoveredCount++;
      }
    }

    this.logger.log(
      `Discovered ${discoveredCount} worker classes from NestJS providers`
    );
  }

  /**
   * Check if an instance wrapper represents a worker class
   */
  private isWorkerWrapper(wrapper: InstanceWrapper): boolean {
    if (!wrapper.metatype) {
      return false;
    }

    return isWorker(wrapper.metatype);
  }

  /**
   * Register a worker from an instance wrapper
   */
  private async registerWorkerFromWrapper(
    wrapper: InstanceWrapper
  ): Promise<void> {
    const workerClass = wrapper.metatype as Type<unknown>;
    const metadata = getWorkerMetadata(workerClass);

    if (!metadata) {
      this.logger.warn(`Worker metadata not found for ${workerClass.name}`);
      return;
    }

    try {
      await this.scanWorkerMethods(workerClass, metadata);

      this.workerManager.registerWorker(metadata);

      this.logger.log(`Registered worker: ${workerClass.name}`);
    } catch (error) {
      this.logger.error(
        `Failed to register worker ${workerClass.name}:`,
        error
      );
    }
  }

  /**
   * Scan a worker class for worker methods
   */
  private async scanWorkerMethods(
    workerClass: Type<unknown>,
    metadata: WorkerMetadata
  ): Promise<void> {
    const prototype = workerClass.prototype;
    const methodNames = this.metadataScanner.scanFromPrototype(
      null,
      prototype,
      (name: string) => name !== "constructor"
    );

    for (const methodName of methodNames) {
      if (typeof methodName !== "string") continue;

      const methodMetadata = this.reflector.get(
        "workerMethod",
        prototype[methodName]
      );
      if (methodMetadata) {
        continue;
      }

      const hasWorkerMethodMetadata = Reflect.hasMetadata(
        "worker:method",
        prototype,
        methodName
      );

      if (hasWorkerMethodMetadata) {
        const options = Reflect.getMetadata(
          "worker:method",
          prototype,
          methodName
        );
        metadata.methods.set(methodName, options);
      }
    }
  }

  /**
   * Initialize worker pools for all discovered workers
   */
  private async initializeWorkerPools(): Promise<void> {
    this.logger.log("Initializing worker pools...");

    try {
      await this.workerManager.initializeAllWorkerPools();
      this.logger.log("All worker pools initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize worker pools:", error);
      throw error;
    }
  }

  /**
   * Get all discovered worker classes
   */
  getDiscoveredWorkers(): Type<unknown>[] {
    return this.workerManager.getRegisteredWorkers();
  }

  /**
   * Get worker metadata for a specific class
   */
  getWorkerMetadata(workerClass: Type<unknown>): WorkerMetadata | null {
    return this.workerManager.getWorkerMetadata(workerClass);
  }

  /**
   * Check if a class is a registered worker
   */
  isRegisteredWorker(workerClass: Type<unknown>): boolean {
    return this.workerManager.isWorkerRegistered(workerClass);
  }

  /**
   * Manually register a worker (useful for dynamic registration)
   */
  async registerWorker(
    workerClass: Type<unknown>,
    metadata?: WorkerMetadata
  ): Promise<void> {
    const workerMetadata = metadata || getWorkerMetadata(workerClass);

    if (!workerMetadata) {
      throw new Error(`Worker metadata not found for ${workerClass.name}`);
    }

    this.workerManager.registerWorker(workerMetadata);
    await this.workerManager.initializeWorkerPool(workerClass);

    this.logger.log(`Manually registered worker: ${workerClass.name}`);
  }

  /**
   * Get statistics about discovered workers
   */
  getDiscoveryStatistics(): {
    totalWorkers: number;
    initializedPools: number;
    totalMethods: number;
  } {
    const workers = this.getDiscoveredWorkers();
    const initializedPools = workers.filter((worker) =>
      this.workerManager.isWorkerPoolInitialized(worker)
    ).length;

    const totalMethods = workers.reduce((sum, worker) => {
      const metadata = this.getWorkerMetadata(worker);
      return sum + (metadata ? metadata.methods.size : 0);
    }, 0);

    return {
      totalWorkers: workers.length,
      initializedPools,
      totalMethods,
    };
  }
}
