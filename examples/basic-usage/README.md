# Basic Usage Example

This example demonstrates the basic usage of the NestJS Worker Library.

## Setup

```bash
npm install
npm run start
```

## What's Included

- **CryptoWorker**: A simple worker for CPU-intensive cryptographic operations
- **CryptoService**: A service that uses the worker
- **CryptoController**: A REST controller to test the functionality

## Files

- `src/crypto.worker.ts` - Worker class with hash methods
- `src/crypto.service.ts` - Service that injects and uses the worker
- `src/crypto.controller.ts` - Controller for testing
- `src/app.module.ts` - Module configuration

## Testing

```bash
# Hash some data
curl -X POST http://localhost:3000/crypto/hash \
  -H "Content-Type: application/json" \
  -d '{"input": "hello world"}'

# Generate a key pair
curl -X POST http://localhost:3000/crypto/keypair
```
