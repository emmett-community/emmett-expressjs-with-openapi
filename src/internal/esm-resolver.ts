/**
 * ESM Resolver for express-openapi-validator operation handlers.
 *
 * INTERNAL MODULE - Not part of public API.
 *
 * PROBLEM:
 * When using TypeScript runtime (tsx) with express-openapi-validator's operationHandlers:
 * - Our code uses `import()` to load handlers (ESM)
 * - express-openapi-validator uses `require()` to load handlers (CJS)
 * - Node.js maintains separate module caches for ESM and CJS
 * - This creates TWO separate instances of the same handler module
 * - Dependencies injected via module-level variables in one instance don't reach the other
 *
 * SOLUTION:
 * This module monkey-patches Module.prototype.require to intercept when
 * express-openapi-validator loads operation handlers and forces it to use
 * dynamic import() instead of require(). This ensures both sides share the
 * same ESM module instance, allowing module-level variables to work correctly.
 *
 * USAGE:
 * This module is automatically activated by getApplication() when operationHandlers
 * are configured. Applications don't need to import or configure anything.
 *
 * LIMITATIONS:
 * - Relies on heuristic detection (caller path includes 'express-openapi-validator')
 * - May break if express-openapi-validator changes its internal loading mechanism
 * - Adds "magic" behavior that may not be immediately obvious to developers
 *
 * FUTURE:
 * If express-openapi-validator migrates to native ESM, this resolver becomes
 * unnecessary and will safely become a no-op.
 */

import { createRequire } from 'node:module';
import path from 'node:path';

let isPatched = false;
const moduleCache = new Map<string, any>();

/**
 * Registers a pre-loaded ESM module so it can be returned synchronously
 * when express-openapi-validator tries to require() it.
 */
export const registerHandlerModule = (modulePath: string, moduleExports: any): void => {
  moduleCache.set(modulePath, moduleExports);
};

/**
 * Activates the ESM resolver for express-openapi-validator handler loading.
 */
export const activateESMResolver = (): void => {
  if (isPatched) {
    return;
  }

  const require = createRequire(import.meta.url);
  const Module = require('module');
  const originalLoad = Module._load;

  Module._load = function (request: string, parent: any, isMain: boolean) {
    const caller = parent?.filename;
    const isValidatorLoading = caller?.includes('express-openapi-validator');
    const isHandlerModule = request.includes('handlers');

    if (isValidatorLoading && isHandlerModule) {
      const absolutePath = path.isAbsolute(request)
        ? request
        : path.resolve(path.dirname(caller), request);

      // Check if we have this module pre-registered
      if (moduleCache.has(absolutePath)) {
        return moduleCache.get(absolutePath);
      }

      throw new Error(
        `Handler module not registered: ${absolutePath}. ` +
        `Make sure initializeHandlers imports and registers the module.`
      );
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  isPatched = true;
};
