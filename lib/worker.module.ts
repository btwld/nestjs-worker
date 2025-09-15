import {
  type DynamicModule,
  Module,
  type Provider,
  type Type,
} from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import type {
  WorkerModuleAsyncOptions,
  WorkerModuleOptions,
  WorkerOptionsFactory,
} from "./config/worker-config.interface";
import { WorkerConfigService } from "./config/worker-config.service";
import { WorkerManager } from "./managers/worker-manager";
import { WorkerProviderFactory } from "./providers/worker-provider.factory";
import { WorkerDiscoveryService } from "./services/worker-discovery.service";

@Module({})
export class WorkerModule {
  /**
   * Register the worker module with synchronous configuration
   */
  static forRoot(options: WorkerModuleOptions = {}): DynamicModule {
    const configProvider: Provider = {
      provide: WorkerConfigService,
      useValue: new WorkerConfigService(options),
    };

    const providers = WorkerModule.createProviders(options);

    return {
      module: WorkerModule,
      imports: [DiscoveryModule],
      providers: [configProvider, ...providers],
      exports: [WorkerManager, WorkerConfigService, WorkerDiscoveryService],
      global: true,
    };
  }

  /**
   * Register the worker module with asynchronous configuration
   */
  static forRootAsync(options: WorkerModuleAsyncOptions): DynamicModule {
    const configProvider = WorkerModule.createAsyncConfigProvider(options);
    const providers = WorkerModule.createAsyncProviders();

    return {
      module: WorkerModule,
      imports: [DiscoveryModule, ...(options.imports || [])],
      providers: [configProvider, ...providers],
      exports: [WorkerManager, WorkerConfigService, WorkerDiscoveryService],
      global: true,
    };
  }

  /**
   * Register the worker module for a specific feature with worker classes
   */
  static forFeature(workerClasses: Type<any>[]): DynamicModule {
    const workerProviders =
      WorkerProviderFactory.createWorkerProviders(workerClasses);

    return {
      module: WorkerModule,
      providers: workerProviders,
      exports: workerProviders,
    };
  }

  /**
   * Create core providers for the module
   */
  private static createProviders(options: WorkerModuleOptions): Provider[] {
    const providers: Provider[] = [
      WorkerManager,
      WorkerDiscoveryService,
      WorkerProviderFactory.createWorkerFactory(),
    ];

    if (options.workers && options.workers.length > 0) {
      const workerClasses = options.workers.map((config) => config.workerClass);
      const workerProviders =
        WorkerProviderFactory.createWorkerProviders(workerClasses);
      providers.push(...workerProviders);
    }

    return providers;
  }

  /**
   * Create providers for async configuration
   */
  private static createAsyncProviders(): Provider[] {
    return [
      WorkerManager,
      WorkerDiscoveryService,
      WorkerProviderFactory.createWorkerFactory(),
    ];
  }

  /**
   * Create async configuration provider
   */
  private static createAsyncConfigProvider(
    options: WorkerModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: WorkerConfigService,
        useFactory: async (...args: any[]) => {
          const moduleOptions = await options.useFactory?.(...args);
          return new WorkerConfigService(moduleOptions);
        },
        inject: options.inject || [],
      };
    }

    if (options.useClass) {
      return {
        provide: WorkerConfigService,
        useFactory: async (optionsFactory: WorkerOptionsFactory) => {
          const moduleOptions = await optionsFactory.createWorkerOptions();
          return new WorkerConfigService(moduleOptions);
        },
        inject: [options.useClass],
      };
    }

    if (options.useExisting) {
      return {
        provide: WorkerConfigService,
        useFactory: async (optionsFactory: WorkerOptionsFactory) => {
          const moduleOptions = await optionsFactory.createWorkerOptions();
          return new WorkerConfigService(moduleOptions);
        },
        inject: [options.useExisting],
      };
    }

    throw new Error("Invalid async configuration options");
  }
}
