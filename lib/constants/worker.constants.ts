export const WORKER_METADATA_KEY = Symbol('worker:metadata');
export const WORKER_METHOD_METADATA_KEY = Symbol('worker:method');
export const WORKER_INJECT_TOKEN = Symbol('worker:inject');

export const DEFAULT_WORKER_OPTIONS = {
  minInstances: 1,
  maxInstances: 4,
  timeout: 30000,
  autoRestart: true,
  restartDelay: 1000,
  maxRestartAttempts: 3,
};

export const DEFAULT_WORKER_METHOD_OPTIONS = {
  retries: 0,
  priority: 'normal' as const,
  serialize: true,
};

export const WORKER_MESSAGE_TIMEOUT = 5000;
export const WORKER_HEALTH_CHECK_INTERVAL = 10000;
export const WORKER_IDLE_TIMEOUT = 60000;
