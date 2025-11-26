/**
 * Handler module importer.
 *
 * INTERNAL MODULE - Not part of public API.
 *
 * Dynamically imports handler modules and registers them in the ESM resolver cache,
 * enabling automatic handler discovery without manual registration.
 */

import { pathToFileURL } from 'node:url';
import { registerHandlerModule } from './esm-resolver.js';
import type { HandlerModuleInfo } from './openapi-parser.js';

export type ImportedHandlerModules = Record<string, any>;

/**
 * Dynamically import and register all handler modules.
 *
 * @param modules - Handler module information from OpenAPI parser
 * @returns Object containing all imported modules, keyed by module name
 */
export async function importAndRegisterHandlers(
  modules: HandlerModuleInfo[],
): Promise<ImportedHandlerModules> {
  const importedHandlers: ImportedHandlerModules = {};

  for (const module of modules) {
    try {
      // Convert to file:// URL for dynamic import
      const fileUrl = pathToFileURL(module.absolutePath).href;

      // Dynamically import the handler module
      const importedModule = await import(fileUrl);

      // Register in ESM resolver cache
      registerHandlerModule(module.absolutePath, importedModule);

      // Store in result object keyed by module name
      importedHandlers[module.moduleName] = importedModule;
    } catch (error) {
      throw new Error(
        `Failed to import handler module "${module.moduleName}" from ${module.absolutePath}: ${
          (error as Error).message
        }`,
      );
    }
  }

  return importedHandlers;
}
