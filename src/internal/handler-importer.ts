/**
 * Handler module importer.
 *
 * INTERNAL MODULE - Not part of public API.
 *
 * Dynamically imports handler modules and registers them in the ESM resolver cache,
 * enabling automatic handler discovery without manual registration.
 */

import { pathToFileURL } from 'node:url';
import { type Logger, safeLog } from '../observability';
import { registerHandlerModule } from './esm-resolver.js';
import type { HandlerModuleInfo } from './openapi-parser.js';

export type ImportedHandlerModules = Record<string, any>;

/**
 * Dynamically import and register all handler modules.
 *
 * @param modules - Handler module information from OpenAPI parser
 * @param logger - Optional logger for debug output
 * @returns Object containing all imported modules, keyed by module name
 */
export async function importAndRegisterHandlers(
  modules: HandlerModuleInfo[],
  logger?: Logger,
): Promise<ImportedHandlerModules> {
  safeLog.debug(logger, 'Importing handler modules', {
    count: modules.length,
    modules: modules.map((m) => m.moduleName),
  });

  const importedHandlers: ImportedHandlerModules = {};

  for (const module of modules) {
    try {
      safeLog.debug(logger, 'Importing handler module', {
        moduleName: module.moduleName,
        absolutePath: module.absolutePath,
      });

      // Convert to file:// URL for dynamic import
      const fileUrl = pathToFileURL(module.absolutePath).href;

      // Dynamically import the handler module
      const importedModule = await import(fileUrl);

      // Register in ESM resolver cache
      registerHandlerModule(module.absolutePath, importedModule);

      // Store in result object keyed by module name
      importedHandlers[module.moduleName] = importedModule;

      safeLog.debug(logger, 'Handler module imported successfully', {
        moduleName: module.moduleName,
      });
    } catch (error) {
      safeLog.error(
        logger,
        `Failed to import handler module "${module.moduleName}"`,
        error,
      );
      throw new Error(
        `Failed to import handler module "${module.moduleName}" from ${module.absolutePath}: ${
          (error as Error).message
        }`,
      );
    }
  }

  return importedHandlers;
}
