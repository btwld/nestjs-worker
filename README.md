<div align="center">
  <img src="logo.svg" alt="NestJS Worker" width="300" height="300">

# nestjs-worker

[![npm version](https://badge.fury.io/js/nestjs-worker.svg)](https://badge.fury.io/js/nestjs-worker)
[![Test](https://github.com/btwld/nestjs-worker/workflows/CI/badge.svg)](https://github.com/btwld/nestjs-worker/actions?query=workflow%3ACI)
[![License: BSD-3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

</div>

A powerful NestJS library that provides seamless integration with Node.js worker_threads, enabling you to execute CPU-intensive tasks in separate threads while maintaining the familiar NestJS service-based developer experience.

## 🚀 Features

- **Seamless NestJS Integration**: Use workers as regular NestJS services with dependency injection
- **Decorator-Based API**: Simple decorators for defining workers and worker methods
- **Automatic Discovery**: Automatically discovers and registers worker classes
- **Pool Management**: Intelligent worker pool management with min/max instances
- **Health Monitoring**: Built-in health checks and auto-restart capabilities
- **Type Safety**: Full TypeScript support with IntelliSense
- **Retry Logic**: Configurable retry mechanisms for failed operations
- **Performance Monitoring**: Built-in metrics and performance tracking

## 📦 Installation

```bash
npm install nestjs-worker
# or
yarn add nestjs-worker
# or
pnpm add nestjs-worker
```

## 🎯 Quick Start

### 1. Define a Worker

```typescript
import { Worker, WorkerMethod } from "nestjs-worker";

@Worker({
  name: "ImageProcessingWorker",
  minInstances: 2,
  maxInstances: 6,
  timeout: 30000,
})
export class ImageProcessingWorker {
  @WorkerMethod({
    timeout: 15000,
    retries: 2,
    priority: "high",
  })
  async processImage(imageData: Buffer): Promise<Buffer> {
    // CPU-intensive image processing
    // This runs in a separate worker thread
    return processedImageData;
  }
}
```

### 2. Use the Worker in a Service

```typescript
import { Injectable } from "@nestjs/common";
import { InjectWorker } from "nestjs-worker";
import { ImageProcessingWorker } from "./image-processing.worker";

@Injectable()
export class ImageService {
  constructor(
    @InjectWorker(ImageProcessingWorker)
    private readonly imageWorker: ImageProcessingWorker
  ) {}

  async processUserImage(imageData: Buffer): Promise<Buffer> {
    // This call is automatically routed to a worker thread
    return this.imageWorker.processImage(imageData);
  }
}
```

### 3. Configure the Module

```typescript
import { Module } from "@nestjs/common";
import { WorkerModule } from "nestjs-worker";
import { ImageProcessingWorker } from "./workers/image-processing.worker";

@Module({
  imports: [
    WorkerModule.forRoot({
      global: {
        defaultMinInstances: 1,
        defaultMaxInstances: 4,
        defaultTimeout: 30000,
        debug: true,
      },
      workers: [
        {
          workerClass: ImageProcessingWorker,
          options: {
            minInstances: 2,
            maxInstances: 6,
          },
        },
      ],
    }),
    WorkerModule.forFeature([ImageProcessingWorker]),
  ],
  // ... rest of your module
})
export class AppModule {}
```

## 📚 API Reference

### Decorators

#### `@Worker(options)`

Marks a class as a worker that can execute methods in worker threads.

**Options:**

- `name?: string` - Worker name for identification
- `minInstances?: number` - Minimum worker instances (default: 1)
- `maxInstances?: number` - Maximum worker instances (default: 4)
- `timeout?: number` - Default timeout in milliseconds (default: 30000)
- `autoRestart?: boolean` - Auto-restart failed workers (default: true)
- `restartDelay?: number` - Delay before restart in milliseconds (default: 1000)
- `maxRestartAttempts?: number` - Maximum restart attempts (default: 3)

#### `@WorkerMethod(options)`

Marks a method as executable in a worker thread.

**Options:**

- `timeout?: number` - Method-specific timeout
- `retries?: number` - Number of retry attempts (default: 0)
- `priority?: 'low' | 'normal' | 'high'` - Execution priority (default: 'normal')
- `serialize?: boolean` - Whether to serialize the result (default: true)

#### `@InjectWorker(WorkerClass)`

Injects a worker proxy that routes method calls to worker threads.

### Configuration

#### Global Configuration

```typescript
WorkerModule.forRoot({
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
  },
  autoDiscovery: true,
});
```

#### Worker-Specific Configuration

```typescript
WorkerModule.forRoot({
  workers: [
    {
      workerClass: MyWorker,
      options: {
        minInstances: 2,
        maxInstances: 8,
        timeout: 60000,
        name: "CustomWorkerName",
      },
    },
  ],
});
```

#### Async Configuration

```typescript
WorkerModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    global: {
      defaultMaxInstances: configService.get("WORKER_MAX_INSTANCES"),
      defaultTimeout: configService.get("WORKER_TIMEOUT"),
    },
  }),
  inject: [ConfigService],
});
```

## 🔧 Advanced Usage

### Custom Worker Runtime

You can provide a custom worker runtime script:

```typescript
WorkerModule.forRoot({
  customWorkerScript: "./custom-worker-runtime.js",
});
```

### Worker Monitoring

Access worker information and metrics:

```typescript
@Injectable()
export class MonitoringService {
  constructor(private readonly workerManager: WorkerManager) {}

  async getWorkerStats() {
    return this.workerManager.getStatistics();
  }

  async getWorkerPoolInfo(workerClass: Type<any>) {
    return this.workerManager.getWorkerPoolInfo(workerClass);
  }
}
```

### Health Checks

Built-in health check endpoint:

```typescript
@Controller("health")
export class HealthController {
  constructor(private readonly workerManager: WorkerManager) {}

  @Get("workers")
  async checkWorkerHealth() {
    const stats = this.workerManager.getStatistics();
    return {
      status: stats.totalErrors === 0 ? "healthy" : "degraded",
      workers: stats,
    };
  }
}
```

## 🎯 Example Use Cases

### Image Processing

```typescript
@Worker({ minInstances: 2, maxInstances: 6 })
export class ImageProcessingWorker {
  @WorkerMethod({ timeout: 15000, retries: 2 })
  async resizeImage(
    buffer: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    // CPU-intensive image resizing
  }

  @WorkerMethod({ timeout: 10000 })
  async compressImage(buffer: Buffer, quality: number): Promise<Buffer> {
    // Image compression
  }
}
```

### Data Processing

```typescript
@Worker({ minInstances: 1, maxInstances: 4 })
export class DataProcessingWorker {
  @WorkerMethod({ timeout: 30000 })
  async processLargeDataset(data: any[]): Promise<any[]> {
    // Heavy data processing
  }

  @WorkerMethod({ timeout: 20000, retries: 1 })
  async performAnalytics(data: any[]): Promise<AnalyticsResult> {
    // Complex analytics calculations
  }
}
```

### File Processing

```typescript
@Worker({ minInstances: 1, maxInstances: 3 })
export class FileProcessingWorker {
  @WorkerMethod({ timeout: 25000 })
  async parseCSV(csvContent: string): Promise<ParsedData> {
    // CSV parsing and validation
  }

  @WorkerMethod({ timeout: 15000 })
  async processDocument(document: Buffer): Promise<ProcessedDocument> {
    // Document processing
  }
}
```

## 🚦 Best Practices

1. **Resource Management**: Set appropriate min/max instances based on your system resources
2. **Timeout Configuration**: Configure timeouts based on expected processing times
3. **Error Handling**: Implement proper error handling in worker methods
4. **Data Serialization**: Keep worker method parameters and return values serializable
5. **Memory Usage**: Monitor memory usage in worker threads
6. **Graceful Shutdown**: Ensure proper cleanup when shutting down the application

## 🔍 Monitoring and Debugging

### Enable Debug Logging

```typescript
WorkerModule.forRoot({
  global: {
    debug: true,
  },
});
```

### Worker Statistics

```typescript
const stats = workerManager.getStatistics();
console.log("Total executions:", stats.totalExecutions);
console.log("Total errors:", stats.totalErrors);
console.log("Average execution time:", stats.averageExecutionTime);
```

### Health Monitoring

```typescript
const poolInfo = workerManager.getWorkerPoolInfo(MyWorker);
console.log("Active instances:", poolInfo.instances.length);
console.log(
  "Available instances:",
  poolInfo.instances.filter((i) => i.status === "idle").length
);
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 🚀 Development & Releases

This project uses automated semantic releases:

- **Development versions**: Push to `develop` branch → `x.x.x-dev.x` versions
- **Stable versions**: Merge to `main` branch → `x.x.x` versions
- **Conventional commits**: Use `feat:`, `fix:`, `feat!:` for automatic versioning

## 📄 License

This project is licensed under the BSD 3-Clause License - see the LICENSE file for details.

## 🆘 Support

- 📖 [Documentation](https://docs.example.com/nestjs-worker)
- 🐛 [Issue Tracker](https://github.com/btwld/nestjs-worker/issues)
- 💬 [Discussions](https://github.com/btwld/nestjs-worker/discussions)
