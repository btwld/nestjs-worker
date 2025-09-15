import type { Type } from "@nestjs/common";
import {
  DEFAULT_WORKER_METHOD_OPTIONS,
  WORKER_METADATA_KEY,
  WORKER_METHOD_METADATA_KEY,
} from "../constants/worker.constants";
import type {
  WorkerMetadata,
  WorkerMethodOptions,
} from "../interfaces/worker.interface";

/**
 * Decorator to mark a method as executable in a worker thread
 */
export function WorkerMethod(
  options: WorkerMethodOptions = {}
): MethodDecorator {
  return (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const methodName = String(propertyKey);
    const methodOptions = { ...DEFAULT_WORKER_METHOD_OPTIONS, ...options };

    let metadata: WorkerMetadata = Reflect.getMetadata(
      WORKER_METADATA_KEY,
      target.constructor
    );
    if (!metadata) {
      metadata = {
        target: target.constructor as Type<unknown>,
        options: {},
        methods: new Map(),
      };
    }

    metadata.methods.set(methodName, methodOptions);

    Reflect.defineMetadata(WORKER_METADATA_KEY, metadata, target.constructor);

    Reflect.defineMetadata(
      WORKER_METHOD_METADATA_KEY,
      methodOptions,
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Get worker method metadata
 */
export function getWorkerMethodMetadata(
  target: unknown,
  methodName: string
): WorkerMethodOptions | undefined {
  return Reflect.getMetadata(WORKER_METHOD_METADATA_KEY, target, methodName);
}

/**
 * Check if a method is marked as a worker method
 */
export function isWorkerMethod(target: unknown, methodName: string): boolean {
  return Reflect.hasMetadata(WORKER_METHOD_METADATA_KEY, target, methodName);
}

/**
 * Get all worker methods from a class
 */
export function getWorkerMethods(target: unknown): string[] {
  const metadata: WorkerMetadata = Reflect.getMetadata(
    WORKER_METADATA_KEY,
    target
  );
  return metadata ? Array.from(metadata.methods.keys()) : [];
}
