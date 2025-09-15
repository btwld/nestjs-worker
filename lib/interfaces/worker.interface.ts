import type { Type } from "@nestjs/common";

export interface WorkerOptions {
  /**
   * Minimum number of worker instances to maintain
   * @default 1
   */
  minInstances?: number;

  /**
   * Maximum number of worker instances allowed
   * @default 4
   */
  maxInstances?: number;

  /**
   * Default timeout for worker operations in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Whether to automatically restart failed workers
   * @default true
   */
  autoRestart?: boolean;

  /**
   * Delay before restarting a failed worker in milliseconds
   * @default 1000
   */
  restartDelay?: number;

  /**
   * Maximum number of restart attempts
   * @default 3
   */
  maxRestartAttempts?: number;

  /**
   * Worker name for identification
   */
  name?: string;
}

export interface WorkerMethodOptions {
  /**
   * Timeout for this specific method in milliseconds
   */
  timeout?: number;

  /**
   * Number of retry attempts for failed executions
   * @default 0
   */
  retries?: number;

  /**
   * Priority level for method execution
   * @default 'normal'
   */
  priority?: "low" | "normal" | "high";

  /**
   * Whether to serialize the result
   * @default true
   */
  serialize?: boolean;
}

export interface WorkerMessage {
  id: string;
  type: "execute" | "result" | "error" | "ping" | "pong";
  method?: string;
  args?: unknown[];
  result?: unknown;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  timestamp: number;
}

export interface WorkerInstanceInfo {
  id: string;
  status: "idle" | "busy" | "error" | "terminated";
  createdAt: Date;
  lastUsed: Date;
  executionCount: number;
  errorCount: number;
  restartCount: number;
}

export interface WorkerPoolInfo {
  workerClass: Type<unknown>;
  options: WorkerOptions;
  instances: WorkerInstanceInfo[];
  totalExecutions: number;
  totalErrors: number;
  averageExecutionTime: number;
}

export interface WorkerExecutionContext {
  workerId: string;
  method: string;
  args: unknown[];
  timeout: number;
  retries: number;
  attempt: number;
  startTime: number;
}

export interface WorkerMetadata {
  target: Type<unknown>;
  options: WorkerOptions;
  methods: Map<string, WorkerMethodOptions>;
}

export interface DataItem {
  id: string;
  value: number;
  category: string;
  timestamp: number;
}

export interface ProcessedDataItem extends DataItem {
  processedAt: Date;
  normalizedValue: number;
}

export interface DataAggregation {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  categories: Record<string, number>;
  processedAt: number;
}

export interface DataAnalysis {
  trends: Array<{
    period: string;
    direction: string;
    confidence: number;
  }>;
  correlations: Array<{
    variables: string[];
    coefficient: number;
  }>;
  outliers: number[];
  summary: {
    count: number;
    sum: number;
    average: number;
    processedAt: number;
  };
}

export interface ComplexAnalysis {
  patterns: Array<{
    type: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
  }>;
  complexity: {
    entropy: number;
    variance: number;
    skewness: number;
  };
  recommendations: string[];
  processedAt: number;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  content?: string;
}

export interface ProcessedFile extends FileInfo {
  processed: boolean;
  processedAt: number;
  batchIndex?: number;
  status?: string;
}

export interface FileReport {
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  successfulProcessing: number;
  averageProcessingTime: number;
  generatedAt: number;
}

export interface CSVRow {
  row: number;
  data: string[];
  parsedAt: number;
}
