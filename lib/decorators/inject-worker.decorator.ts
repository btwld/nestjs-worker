import { Inject, type Type } from "@nestjs/common";
import { WORKER_INJECT_TOKEN } from "../constants/worker.constants";

/**
 * Decorator to inject a worker service
 * This creates a proxy that intercepts method calls and routes them to worker threads
 */
export function InjectWorker<T = any>(
  workerClass: Type<T>
): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    const token = `${WORKER_INJECT_TOKEN.toString()}_${workerClass.name}`;

    Reflect.defineMetadata(
      "workerClass",
      workerClass,
      target,
      propertyKey || ""
    );
    Reflect.defineMetadata(
      "workerClassToken",
      token,
      target,
      propertyKey || ""
    );

    return Inject(token)(target, propertyKey, parameterIndex);
  };
}

/**
 * Get the worker class from inject metadata
 */
export function getWorkerClassFromInject(
  target: any,
  propertyKey?: string | symbol
): Type<any> | undefined {
  return Reflect.getMetadata("workerClass", target, propertyKey || "");
}

/**
 * Get the worker class token from inject metadata
 */
export function getWorkerClassToken(
  target: any,
  propertyKey?: string | symbol
): string | undefined {
  return Reflect.getMetadata("workerClassToken", target, propertyKey || "");
}
