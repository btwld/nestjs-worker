# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# 1.0.0 (2025-09-15)


### Bug Fixes

* correct repository URLs and GitHub organization ([c1451bc](https://github.com/btwld/nestjs-worker/commit/c1451bc9de7ebb865d803cc5ceb05a419b4912e0))
* remove compiled files from examples ([be3bf8a](https://github.com/btwld/nestjs-worker/commit/be3bf8acb9a322700636f493da1c680e12b6052b))
* temporarily disable npm publishing ([e42f70f](https://github.com/btwld/nestjs-worker/commit/e42f70f0b0a625d8a1362d6da14c3c4d5e44b53d))


### Features

* improve logo size and update Node.js versions ([0338aa5](https://github.com/btwld/nestjs-worker/commit/0338aa5dbf4c3ca2848a043dcf406d1204817e58))
* initial release of nestjs-worker library ([322b5cc](https://github.com/btwld/nestjs-worker/commit/322b5cc12f106e4463abcc7f803649a6cdcdddb7))

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
