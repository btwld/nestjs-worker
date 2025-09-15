import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import type { WorkerMessage } from "../interfaces/worker.interface";

let importESMCached: (specifier: string) => Promise<unknown> | undefined;
function getImportESM() {
  if (importESMCached === undefined) {
    importESMCached = new Function(
      "specifier",
      "return import(specifier)"
    ) as typeof importESMCached;
  }
  return importESMCached;
}

class WorkerRuntime {
  private workerInstance: unknown;
  private readonly workerId: string;
  private readonly workerClassName: string;

  constructor() {
    this.workerId = workerData.workerId;
    this.workerClassName = workerData.workerClassName;

    this.setupMessageHandler();
    this.initializeWorkerInstance();
  }

  private setupMessageHandler(): void {
    if (!parentPort) {
      throw new Error("Worker must be run in a worker thread");
    }

    parentPort.on("message", async (message: WorkerMessage) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        this.sendError(message.id, error as Error);
      }
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception in worker:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled rejection in worker:", reason);
      process.exit(1);
    });
  }

  private async initializeWorkerInstance(): Promise<void> {
    try {
      this.workerInstance = await this.createWorkerInstance();
      this.sendReady();
    } catch (error) {
      console.error("Failed to initialize worker instance:", error);
      process.exit(1);
    }
  }

  private async createWorkerInstance(): Promise<unknown> {
    try {
      let WorkerClass: new () => unknown;

      const loadingStrategies = [
        () => this.loadFromUserDistDirectory(),
        () => this.loadFromStandardPaths(),
        () => this.loadFromNodeModules(),
      ];

      for (const strategy of loadingStrategies) {
        try {
          const result = await strategy();
          if (result) {
            WorkerClass = result;
            console.log(
              `Successfully loaded worker class: ${this.workerClassName}`
            );
            return new WorkerClass();
          }
        } catch (error) {
          console.log(
            `Loading strategy failed, trying next: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      throw new Error(
        `Worker class ${this.workerClassName} not found in any location. ` +
          `Make sure your worker is compiled and available in the dist directory.`
      );
    } catch (error) {
      console.error(
        `Failed to load worker class ${this.workerClassName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Strategy 1: Load from user's dist directory (standard NestJS build output)
   * This works when users include workers in their normal build process
   */
  private async loadFromUserDistDirectory(): Promise<
    (new () => unknown) | null
  > {
    const possiblePaths = [
      path.resolve(process.cwd(), "dist", this.getWorkerFilePath()),
      path.resolve(process.cwd(), "dist", "src", this.getWorkerFilePath()),
      path.resolve(process.cwd(), "dist", "main", this.getWorkerFilePath()),
    ];

    for (const workerPath of possiblePaths) {
      if (this.fileExists(workerPath)) {
        console.log(`Loading worker from user dist: ${workerPath}`);
        const result = await this.loadModuleFromPath(workerPath);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Strategy 2: Load from standard paths (universal worker directories)
   */
  private async loadFromStandardPaths(): Promise<(new () => unknown) | null> {
    const standardPaths = [
      path.resolve(process.cwd(), "dist/workers", this.getWorkerFileName()),
      path.resolve(process.cwd(), "dist/app/workers", this.getWorkerFileName()),
      path.resolve(process.cwd(), "dist/src/workers", this.getWorkerFileName()),
      ...(process.env.WORKER_EXAMPLE_PATH
        ? [
            path.resolve(
              process.cwd(),
              process.env.WORKER_EXAMPLE_PATH,
              this.getWorkerFileName()
            ),
          ]
        : [
            path.resolve(
              process.cwd(),
              "dist/example-api/workers",
              this.getWorkerFileName()
            ),
          ]),
    ];

    for (const workerPath of standardPaths) {
      if (this.fileExists(workerPath)) {
        console.log(`Loading worker from standard path: ${workerPath}`);
        const result = await this.loadModuleFromPath(workerPath);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Strategy 3: Load from node_modules (for published workers)
   */
  private async loadFromNodeModules(): Promise<(new () => unknown) | null> {
    try {
      const moduleName = this.workerClassName
        .toLowerCase()
        .replace(/worker$/, "-worker");
      console.log(`Attempting to load from node_modules: ${moduleName}`);
      const result = await this.loadModuleFromPath(moduleName);
      return result;
    } catch (_error) {
      return null;
    }
  }

  private getWorkerFilePath(): string {
    const fileName = this.getWorkerFileName();

    const patterns = [
      `workers/${fileName}`,
      `app/workers/${fileName}`,
      `src/workers/${fileName}`,
      fileName,
    ];

    return patterns[0];
  }

  /**
   * Universal module loader that supports both CommonJS and ES modules
   * Inspired by Piscina's approach for maximum compatibility
   */
  private async loadModuleFromPath(
    filePath: string
  ): Promise<(new () => unknown) | null> {
    try {
      let module: unknown;
      try {
        module = await import(filePath);
        if (typeof module !== "function") {
          const moduleRecord = module as Record<string, unknown>;
          module = moduleRecord[this.workerClassName] || moduleRecord.default;
        }
        if (typeof module === "function") {
          return module as new () => unknown;
        }
      } catch (error) {
        console.log(
          `Standard import failed for ${filePath}, trying dynamic import:`,
          error instanceof Error ? error.message : String(error)
        );
      }

      try {
        const importESM = getImportESM();
        module = await importESM(pathToFileURL(filePath).href);
        if (typeof module !== "function") {
          const moduleRecord = module as Record<string, unknown>;
          module = moduleRecord[this.workerClassName] || moduleRecord.default;
        }
        if (typeof module === "function") {
          return module as new () => unknown;
        }
      } catch (error) {
        console.log(
          `Dynamic import failed for ${filePath}, trying require:`,
          error instanceof Error ? error.message : String(error)
        );
      }

      try {
        module = require(filePath);
        const moduleRecord = module as Record<string, unknown>;
        module = moduleRecord[this.workerClassName] || moduleRecord.default;
        if (typeof module === "function") {
          return module as new () => unknown;
        }
      } catch (error) {
        console.log(
          `Require failed for ${filePath}:`,
          error instanceof Error ? error.message : String(error)
        );
      }

      console.log(`No valid worker class found in ${filePath}`);
      return null;
    } catch (error) {
      console.log(
        `Failed to load module from ${filePath}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  private fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  private getWorkerFileName(): string {
    const baseName = this.workerClassName
      .replace(/Worker$/, "")
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");

    return `${baseName}.worker.js`;
  }

  private sendReady(): void {
    const message: WorkerMessage = {
      id: "ready",
      type: "result",
      result: { ready: true, workerId: this.workerId },
      timestamp: Date.now(),
    };
    parentPort?.postMessage(message);
  }

  private async handleMessage(message: WorkerMessage): Promise<void> {
    switch (message.type) {
      case "execute":
        await this.executeMethod(message);
        break;
      case "ping":
        this.sendPong(message.id);
        break;
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  private async executeMethod(message: WorkerMessage): Promise<void> {
    if (!message.method || !message.args) {
      throw new Error("Invalid execute message: missing method or args");
    }

    try {
      const method = (this.workerInstance as Record<string, unknown>)[
        message.method
      ];
      if (typeof method !== "function") {
        throw new Error(`Method ${message.method} not found or not a function`);
      }

      const result = await method.apply(this.workerInstance, message.args);
      this.sendResult(message.id, result);
    } catch (error) {
      this.sendError(message.id, error as Error);
    }
  }

  private sendResult(messageId: string, result: unknown): void {
    const response: WorkerMessage = {
      id: messageId,
      type: "result",
      result,
      timestamp: Date.now(),
    };
    parentPort?.postMessage(response);
  }

  private sendError(messageId: string, error: Error): void {
    const response: WorkerMessage = {
      id: messageId,
      type: "error",
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      timestamp: Date.now(),
    };
    parentPort?.postMessage(response);
  }

  private sendPong(messageId: string): void {
    const response: WorkerMessage = {
      id: messageId,
      type: "pong",
      timestamp: Date.now(),
    };
    parentPort?.postMessage(response);
  }
}

new WorkerRuntime();
