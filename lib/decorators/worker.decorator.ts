import { Injectable, SetMetadata } from "@nestjs/common";
import {
  DEFAULT_WORKER_OPTIONS,
  WORKER_METADATA_KEY,
} from "../constants/worker.constants";
import type {
  WorkerMetadata,
  WorkerOptions,
} from "../interfaces/worker.interface";

/**
 * Decorator to mark a class as a worker
 * This decorator automatically makes the class injectable and sets worker metadata
 */
export function Worker(options: WorkerOptions = {}): ClassDecorator {
  return (target: any) => {
    Injectable()(target);

    const workerOptions = { ...DEFAULT_WORKER_OPTIONS, ...options };

    const existingMetadata: WorkerMetadata = Reflect.getMetadata(
      WORKER_METADATA_KEY,
      target
    ) || {
      target,
      options: workerOptions,
      methods: new Map(),
    };

    const metadata: WorkerMetadata = {
      ...existingMetadata,
      target,
      options: workerOptions,
    };

    Reflect.defineMetadata(WORKER_METADATA_KEY, metadata, target);

    SetMetadata("isWorker", true)(target);

    return target;
  };
}

/**
 * Get worker metadata from a class
 */
export function getWorkerMetadata(target: any): WorkerMetadata | undefined {
  return Reflect.getMetadata(WORKER_METADATA_KEY, target);
}

/**
 * Check if a class is marked as a worker
 */
export function isWorker(target: any): boolean {
  return Reflect.getMetadata("isWorker", target) === true;
}
