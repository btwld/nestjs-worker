import { Injectable, Logger } from "@nestjs/common";
import { DEFAULT_WORKER_OPTIONS } from "../constants/worker.constants";
import type { WorkerOptions } from "../interfaces/worker.interface";
import type {
  WorkerModuleOptions,
  WorkerSpecificConfig,
} from "./worker-config.interface";

@Injectable()
export class WorkerConfigService {
  private readonly logger = new Logger(WorkerConfigService.name);
  private readonly moduleOptions: WorkerModuleOptions;

  constructor(options: WorkerModuleOptions = {}) {
    this.moduleOptions = this.validateAndNormalizeOptions(options);
    this.logger.log("Worker configuration initialized");
  }

  /**
   * Validate and normalize module options
   */
  private validateAndNormalizeOptions(
    options: WorkerModuleOptions
  ): WorkerModuleOptions {
    const normalized: WorkerModuleOptions = {
      global: {
        defaultMinInstances: 1,
        defaultMaxInstances: 4,
        defaultTimeout: 30000,
        defaultAutoRestart: true,
        defaultRestartDelay: 1000,
        defaultMaxRestartAttempts: 3,
        healthCheckInterval: 10000,
        workerIdleTimeout: 60000,
        debug: false,
        ...options.global,
      },
      workers: options.workers || [],
      autoDiscovery: options.autoDiscovery !== false, // Default to true
      customWorkerScript: options.customWorkerScript,
    };

    if (normalized.global) {
      this.validateGlobalOptions(normalized.global);
    }

    if (normalized.workers) {
      normalized.workers.forEach((config, index) => {
        this.validateWorkerSpecificConfig(config, index);
      });
    }

    return normalized;
  }

  /**
   * Validate global options
   */
  private validateGlobalOptions(
    global: NonNullable<WorkerModuleOptions["global"]>
  ): void {
    if ((global.defaultMinInstances ?? 0) < 0) {
      throw new Error("defaultMinInstances must be >= 0");
    }

    if ((global.defaultMaxInstances ?? 0) < (global.defaultMinInstances ?? 0)) {
      throw new Error("defaultMaxInstances must be >= defaultMinInstances");
    }

    if ((global.defaultTimeout ?? 0) <= 0) {
      throw new Error("defaultTimeout must be > 0");
    }

    if ((global.defaultRestartDelay ?? 0) < 0) {
      throw new Error("defaultRestartDelay must be >= 0");
    }

    if ((global.defaultMaxRestartAttempts ?? 0) < 0) {
      throw new Error("defaultMaxRestartAttempts must be >= 0");
    }

    if ((global.healthCheckInterval ?? 0) <= 0) {
      throw new Error("healthCheckInterval must be > 0");
    }

    if ((global.workerIdleTimeout ?? 0) <= 0) {
      throw new Error("workerIdleTimeout must be > 0");
    }
  }

  /**
   * Validate worker-specific configuration
   */
  private validateWorkerSpecificConfig(
    config: WorkerSpecificConfig,
    index: number
  ): void {
    if (!config.workerClass) {
      throw new Error(
        `Worker configuration at index ${index} is missing workerClass`
      );
    }

    const options = config.options;
    if (options.minInstances !== undefined && options.minInstances < 0) {
      throw new Error(
        `Worker ${config.workerClass.name}: minInstances must be >= 0`
      );
    }

    if (
      options.maxInstances !== undefined &&
      options.minInstances !== undefined
    ) {
      if (options.maxInstances < options.minInstances) {
        throw new Error(
          `Worker ${config.workerClass.name}: maxInstances must be >= minInstances`
        );
      }
    }

    if (options.timeout !== undefined && options.timeout <= 0) {
      throw new Error(`Worker ${config.workerClass.name}: timeout must be > 0`);
    }

    if (options.restartDelay !== undefined && options.restartDelay < 0) {
      throw new Error(
        `Worker ${config.workerClass.name}: restartDelay must be >= 0`
      );
    }

    if (
      options.maxRestartAttempts !== undefined &&
      options.maxRestartAttempts < 0
    ) {
      throw new Error(
        `Worker ${config.workerClass.name}: maxRestartAttempts must be >= 0`
      );
    }
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): NonNullable<WorkerModuleOptions["global"]> {
    if (!this.moduleOptions.global) {
      throw new Error("Global configuration is not available");
    }
    return this.moduleOptions.global;
  }

  /**
   * Get worker-specific configuration
   */
  getWorkerSpecificConfigs(): WorkerSpecificConfig[] {
    return this.moduleOptions.workers || [];
  }

  /**
   * Get effective options for a specific worker class
   */
  getWorkerOptions(
    workerClass: unknown,
    baseOptions: WorkerOptions = {}
  ): WorkerOptions {
    const global = this.getGlobalConfig();
    const specific = this.getWorkerSpecificConfigs().find(
      (config) => config.workerClass === workerClass
    );

    const effectiveOptions: WorkerOptions = {
      ...DEFAULT_WORKER_OPTIONS,
      minInstances: global.defaultMinInstances,
      maxInstances: global.defaultMaxInstances,
      timeout: global.defaultTimeout,
      autoRestart: global.defaultAutoRestart,
      restartDelay: global.defaultRestartDelay,
      maxRestartAttempts: global.defaultMaxRestartAttempts,
      ...(specific?.options || {}),
      ...baseOptions,
    };

    return effectiveOptions;
  }

  /**
   * Check if auto-discovery is enabled
   */
  isAutoDiscoveryEnabled(): boolean {
    return this.moduleOptions.autoDiscovery !== false;
  }

  /**
   * Get custom worker script path if configured
   */
  getCustomWorkerScript(): string | undefined {
    return this.moduleOptions.customWorkerScript;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.getGlobalConfig().debug || false;
  }

  /**
   * Get health check interval
   */
  getHealthCheckInterval(): number {
    return this.getGlobalConfig().healthCheckInterval ?? 30000;
  }

  /**
   * Get worker idle timeout
   */
  getWorkerIdleTimeout(): number {
    return this.getGlobalConfig().workerIdleTimeout ?? 60000;
  }

  /**
   * Get all module options (for debugging)
   */
  getAllOptions(): WorkerModuleOptions {
    return { ...this.moduleOptions };
  }

  /**
   * Update global configuration (runtime configuration change)
   */
  updateGlobalConfig(
    updates: Partial<NonNullable<WorkerModuleOptions["global"]>>
  ): void {
    if (!this.moduleOptions.global) {
      throw new Error("Global configuration is not available for update");
    }
    Object.assign(this.moduleOptions.global, updates);
    this.validateGlobalOptions(this.moduleOptions.global);
    this.logger.log("Global worker configuration updated");
  }
}
