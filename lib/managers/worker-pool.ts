import { randomUUID } from "node:crypto";
import * as path from "node:path";
import { Logger, type Type } from "@nestjs/common";
import {
  DEFAULT_WORKER_METHOD_OPTIONS,
  DEFAULT_WORKER_OPTIONS,
} from "../constants/worker.constants";
import type {
  WorkerMethodOptions,
  WorkerOptions,
  WorkerPoolInfo,
} from "../interfaces/worker.interface";
import { WorkerInstance } from "./worker-instance";

export class WorkerPool {
  private readonly logger = new Logger(WorkerPool.name);
  private readonly instances = new Map<string, WorkerInstance>();
  private readonly options: WorkerOptions & {
    minInstances: number;
    maxInstances: number;
    timeout: number;
    autoRestart: boolean;
    restartDelay: number;
    maxRestartAttempts: number;
  };
  private readonly workerScript: string;
  private healthCheckInterval?: NodeJS.Timeout;
  private totalExecutions = 0;
  private totalErrors = 0;
  private executionTimes: number[] = [];

  constructor(
    private readonly workerClass: Type<unknown>,
    options: WorkerOptions = {}
  ) {
    this.options = { ...DEFAULT_WORKER_OPTIONS, ...options };
    this.workerScript = this.getWorkerScript();
    this.initializePool();
    this.startHealthCheck();
  }

  private getWorkerScript(): string {
    const runtimePath = path.join(__dirname, "../runtime/worker-runtime.js");

    if (!require("node:fs").existsSync(runtimePath)) {
      const devPath = path.join(
        process.cwd(),
        "dist/worker/runtime/worker-runtime.js"
      );
      if (require("node:fs").existsSync(devPath)) {
        return devPath;
      }
    }

    return runtimePath;
  }

  private async initializePool(): Promise<void> {
    this.logger.log(
      `Initializing worker pool for ${this.workerClass.name} with ${this.options.minInstances} instances`
    );

    for (let i = 0; i < this.options.minInstances; i++) {
      await this.createWorkerInstance();
    }
  }

  private async createWorkerInstance(): Promise<WorkerInstance> {
    const instanceId = randomUUID();
    const workerData = {
      workerClassName: this.workerClass.name,
      workerClassPath: this.getWorkerClassPath(),
    };

    try {
      const instance = new WorkerInstance(
        instanceId,
        this.workerScript,
        workerData
      );
      this.instances.set(instanceId, instance);

      this.logger.log(
        `Created worker instance ${instanceId} for ${this.workerClass.name}`
      );
      return instance;
    } catch (error) {
      this.logger.error(
        `Failed to create worker instance for ${this.workerClass.name}:`,
        error
      );
      throw error;
    }
  }

  private getWorkerClassPath(): string {
    return undefined;
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 10000);
  }

  private async performHealthCheck(): Promise<void> {
    const unhealthyInstances: string[] = [];

    for (const [id, instance] of this.instances) {
      if (!instance.isHealthy) {
        unhealthyInstances.push(id);
        continue;
      }

      if (instance.isAvailable) {
        const isResponsive = await instance.ping();
        if (!isResponsive) {
          unhealthyInstances.push(id);
        }
      }
    }

    for (const id of unhealthyInstances) {
      await this.removeInstance(id);
    }

    await this.ensureMinimumInstances();
  }

  private async removeInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (instance) {
      try {
        await instance.terminate();
      } catch (error) {
        this.logger.warn(`Error terminating instance ${instanceId}:`, error);
      }
      this.instances.delete(instanceId);
      this.logger.log(`Removed unhealthy worker instance ${instanceId}`);
    }
  }

  private async ensureMinimumInstances(): Promise<void> {
    const currentCount = this.instances.size;
    if (currentCount < this.options.minInstances) {
      const needed = this.options.minInstances - currentCount;
      this.logger.log(
        `Creating ${needed} additional worker instances to meet minimum requirement`
      );

      for (let i = 0; i < needed; i++) {
        try {
          await this.createWorkerInstance();
        } catch (error) {
          this.logger.error(
            "Failed to create replacement worker instance:",
            error
          );
        }
      }
    }
  }

  private getAvailableInstance(): WorkerInstance | null {
    for (const instance of this.instances.values()) {
      if (instance.isAvailable) {
        return instance;
      }
    }
    return null;
  }

  private async scaleUp(): Promise<WorkerInstance | null> {
    if (this.instances.size >= this.options.maxInstances) {
      return null;
    }

    try {
      return await this.createWorkerInstance();
    } catch (error) {
      this.logger.error("Failed to scale up worker pool:", error);
      return null;
    }
  }

  async execute(
    method: string,
    args: unknown[],
    methodOptions: WorkerMethodOptions = {}
  ): Promise<unknown> {
    const options = {
      ...DEFAULT_WORKER_METHOD_OPTIONS,
      ...methodOptions,
      timeout: methodOptions.timeout || this.options.timeout,
    };
    const startTime = Date.now();

    let instance = this.getAvailableInstance();

    if (!instance) {
      instance = await this.scaleUp();
    }

    if (!instance) {
      instance = await this.waitForAvailableInstance();
    }

    if (!instance) {
      throw new Error(
        `No worker instances available for ${this.workerClass.name}`
      );
    }

    try {
      const result = await this.executeWithRetries(
        instance,
        method,
        args,
        options
      );

      const executionTime = Date.now() - startTime;
      this.totalExecutions++;
      this.executionTimes.push(executionTime);

      if (this.executionTimes.length > 100) {
        this.executionTimes.shift();
      }

      return result;
    } catch (error) {
      this.totalErrors++;
      throw error;
    }
  }

  private async executeWithRetries(
    instance: WorkerInstance,
    method: string,
    args: unknown[],
    options: WorkerMethodOptions & { timeout: number }
  ): Promise<unknown> {
    let lastError: Error;

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        return await instance.execute(method, args, options.timeout);
      } catch (error) {
        lastError = error as Error;

        if (attempt < options.retries) {
          this.logger.warn(
            `Worker execution attempt ${attempt + 1} failed, retrying...`,
            error
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1))
          );
        }
      }
    }

    throw lastError!;
  }

  private async waitForAvailableInstance(
    timeout: number = 30000
  ): Promise<WorkerInstance | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const instance = this.getAvailableInstance();
      if (instance) {
        return instance;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return null;
  }

  async shutdown(): Promise<void> {
    this.logger.log(`Shutting down worker pool for ${this.workerClass.name}`);

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const shutdownPromises = Array.from(this.instances.values()).map(
      (instance) =>
        instance
          .terminate()
          .catch((error) =>
            this.logger.error("Error during worker shutdown:", error)
          )
    );

    await Promise.all(shutdownPromises);
    this.instances.clear();
  }

  get info(): WorkerPoolInfo {
    return {
      workerClass: this.workerClass,
      options: this.options,
      instances: Array.from(this.instances.values()).map(
        (instance) => instance.info
      ),
      totalExecutions: this.totalExecutions,
      totalErrors: this.totalErrors,
      averageExecutionTime:
        this.executionTimes.length > 0
          ? this.executionTimes.reduce((a, b) => a + b, 0) /
            this.executionTimes.length
          : 0,
    };
  }

  get instanceCount(): number {
    return this.instances.size;
  }

  get availableInstanceCount(): number {
    return Array.from(this.instances.values()).filter(
      (instance) => instance.isAvailable
    ).length;
  }
}
