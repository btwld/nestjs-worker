import type {
  Type,
  DynamicModule,
  InjectionToken,
  OptionalFactoryDependency,
} from "@nestjs/common";

export interface WorkerModuleOptions {
  /**
   * Global worker configuration that applies to all workers
   */
  global?: {
    /**
     * Default minimum number of worker instances
     * @default 1
     */
    defaultMinInstances?: number;

    /**
     * Default maximum number of worker instances
     * @default 4
     */
    defaultMaxInstances?: number;

    /**
     * Default timeout for worker operations in milliseconds
     * @default 30000
     */
    defaultTimeout?: number;

    /**
     * Default auto-restart behavior
     * @default true
     */
    defaultAutoRestart?: boolean;

    /**
     * Default restart delay in milliseconds
     * @default 1000
     */
    defaultRestartDelay?: number;

    /**
     * Default maximum restart attempts
     * @default 3
     */
    defaultMaxRestartAttempts?: number;

    /**
     * Health check interval in milliseconds
     * @default 10000
     */
    healthCheckInterval?: number;

    /**
     * Worker idle timeout in milliseconds
     * @default 60000
     */
    workerIdleTimeout?: number;

    /**
     * Enable debug logging
     * @default false
     */
    debug?: boolean;
  };

  /**
   * Worker-specific configurations
   */
  workers?: WorkerSpecificConfig[];

  /**
   * Whether to automatically discover workers
   * @default true
   */
  autoDiscovery?: boolean;

  /**
   * Custom worker script path (for advanced use cases)
   */
  customWorkerScript?: string;
}

export interface WorkerSpecificConfig {
  /**
   * The worker class
   */
  workerClass: Type<unknown>;

  /**
   * Worker-specific options that override global defaults
   */
  options: {
    minInstances?: number;
    maxInstances?: number;
    timeout?: number;
    autoRestart?: boolean;
    restartDelay?: number;
    maxRestartAttempts?: number;
    name?: string;
  };
}

export interface WorkerModuleAsyncOptions {
  /**
   * Factory function to create module options
   */
  useFactory?: (
    ...args: unknown[]
  ) => Promise<WorkerModuleOptions> | WorkerModuleOptions;

  /**
   * Dependencies to inject into the factory function
   */
  inject?: (InjectionToken | OptionalFactoryDependency)[];

  /**
   * Class to use for creating module options
   */
  useClass?: Type<WorkerOptionsFactory>;

  /**
   * Existing provider to use for module options
   */
  useExisting?: Type<WorkerOptionsFactory>;

  /**
   * Additional imports needed for async configuration
   */
  imports?: (Type<unknown> | DynamicModule)[];
}

export interface WorkerOptionsFactory {
  createWorkerOptions(): Promise<WorkerModuleOptions> | WorkerModuleOptions;
}
