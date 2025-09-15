# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-dev.1] - 2025-09-15

### Added

- 🎉 Initial pre-release of nestjs-worker library
- `@Worker` decorator for marking worker classes
- `@WorkerMethod` decorator for worker thread execution
- `@InjectWorker` decorator for dependency injection
- Auto-discovery of worker classes using NestJS DiscoveryModule
- Worker pool management with intelligent scaling
- Full TypeScript support with proper type inference
- Built-in error handling and retry mechanisms
- Worker status monitoring and health checks
- Support for both CommonJS and ES modules
- Comprehensive documentation and examples

### Features

- Seamless NestJS integration with dependency injection
- CPU-intensive task execution in separate worker threads
- Configurable worker pools with min/max instances
- Automatic worker restart on failures
- Performance monitoring and metrics
- Production-ready error handling
- Modern toolchain support (Biome, pnpm, TypeScript 5.x)

### Dependencies

- Requires NestJS 10.x or 11.x
- Node.js 16+ with worker_threads support
- TypeScript 4.8+ for proper decorator support
