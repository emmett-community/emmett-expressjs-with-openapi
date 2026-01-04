/**
 * Observability types for emmett-expressjs-with-openapi.
 *
 * This module provides optional logging integration
 * following a "silent by default" philosophy.
 */

/**
 * Canonical Logger contract for the Emmett ecosystem.
 *
 * This package defines the canonical Logger interface.
 * Implementations (Pino, Winston, etc.) MUST adapt to this contract.
 * This contract MUST NOT adapt to any specific implementation.
 *
 * Semantic Rules:
 * - context (first parameter): ALWAYS structured data as Record<string, unknown>
 * - message (second parameter): ALWAYS the human-readable log message
 * - The order is NEVER inverted
 * - The (message, data) form is NOT valid for this contract
 *
 * @example
 * ```typescript
 * // Pino - native compatibility
 * import pino from 'pino';
 * const logger = pino();
 * // logger.info({ orderId }, 'Order created') matches our contract
 * ```
 */
export interface Logger {
  /**
   * Log debug-level message with structured context.
   * @param context - Structured data to include in the log entry
   * @param message - Optional human-readable message
   */
  debug(context: Record<string, unknown>, message?: string): void;

  /**
   * Log info-level message with structured context.
   * @param context - Structured data to include in the log entry
   * @param message - Optional human-readable message
   */
  info(context: Record<string, unknown>, message?: string): void;

  /**
   * Log warn-level message with structured context.
   * @param context - Structured data to include in the log entry
   * @param message - Optional human-readable message
   */
  warn(context: Record<string, unknown>, message?: string): void;

  /**
   * Log error-level message with structured context.
   * @param context - Structured data to include in the log entry (may include 'err' key)
   * @param message - Optional human-readable message
   */
  error(context: Record<string, unknown>, message?: string): void;
}

/**
 * Observability configuration options.
 */
export type ObservabilityOptions = {
  /**
   * Optional logger instance for diagnostic output.
   * When not provided, the library operates silently.
   *
   * @example
   * ```typescript
   * import pino from 'pino';
   *
   * const logger = pino();
   *
   * const app = await getApplication({
   *   observability: { logger },
   * });
   * ```
   */
  logger?: Logger;
};

/**
 * Internal helper to safely call logger methods.
 *
 * IMPORTANT: safeLog is the ONLY translation point between internal usage
 * and the Logger contract.
 *
 * Internal Usage Pattern:
 *   safeLog.info(logger, 'Order created', { orderId: 123 })
 *
 * Translation to Logger Contract:
 *   logger.info({ orderId: 123 }, 'Order created')
 *
 * This allows ergonomic internal usage while ensuring all injected loggers
 * receive calls in the canonical (context, message) format.
 */
export const safeLog = {
  debug: (logger: Logger | undefined, msg: string, data?: unknown) => {
    if (!logger) return;
    logger.debug(normalizeContext(data), msg);
  },
  info: (logger: Logger | undefined, msg: string, data?: unknown) => {
    if (!logger) return;
    logger.info(normalizeContext(data), msg);
  },
  warn: (logger: Logger | undefined, msg: string, data?: unknown) => {
    if (!logger) return;
    logger.warn(normalizeWarnContext(data), msg);
  },
  error: (logger: Logger | undefined, msg: string, error?: unknown) => {
    if (!logger) return;
    logger.error(normalizeErrorContext(error), msg);
  },
};

/**
 * Normalize data to context object for regular log methods.
 * Creates a shallow copy to avoid accidental mutation of the original object.
 */
function normalizeContext(data: unknown): Record<string, unknown> {
  if (data === undefined || data === null) {
    return {};
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>) };
  }
  return { data };
}

/**
 * Normalize data to context object for warn log method.
 * Uses 'err' key for Error instances to prevent property leakage (like 'name' overwriting logger name).
 * Creates a shallow copy to avoid accidental mutation of the original object.
 */
function normalizeWarnContext(data: unknown): Record<string, unknown> {
  if (data === undefined || data === null) {
    return {};
  }
  if (data instanceof Error) {
    return { err: data };
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>) };
  }
  return { data };
}

/**
 * Normalize error to context object for error log method.
 * Uses 'err' key for Pino compatibility (Pino serializes Error objects on 'err' key).
 * Creates a shallow copy to avoid accidental mutation of the original object.
 */
function normalizeErrorContext(error: unknown): Record<string, unknown> {
  if (error === undefined || error === null) {
    return {};
  }
  if (error instanceof Error) {
    return { err: error };
  }
  if (typeof error === 'object' && !Array.isArray(error)) {
    return { ...(error as Record<string, unknown>) };
  }
  return { err: error };
}
