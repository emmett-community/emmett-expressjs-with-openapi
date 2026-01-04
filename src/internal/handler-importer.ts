/**
 * Handler module importer.
 *
 * INTERNAL MODULE - Not part of public API.
 *
 * Dynamically imports handler modules and registers them in the ESM resolver cache,
 * enabling automatic handler discovery without manual registration.
 */

import { access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Logger, safeLog } from '../observability';
import { registerHandlerModule } from './esm-resolver.js';
import type { HandlerModuleInfo } from './openapi-parser.js';

export type ImportedHandlerModules = Record<string, any>;

const moduleExtensions = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'];

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveModulePath = async (modulePath: string): Promise<string> => {
  if (await pathExists(modulePath)) {
    return modulePath;
  }

  if (path.extname(modulePath)) {
    return modulePath;
  }

  for (const ext of moduleExtensions) {
    const candidate = `${modulePath}${ext}`;
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return modulePath;
};

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
      const resolvedPath = await resolveModulePath(module.absolutePath);

      safeLog.debug(logger, 'Importing handler module', {
        moduleName: module.moduleName,
        absolutePath: module.absolutePath,
        resolvedPath,
      });

      // Convert to file:// URL for dynamic import
      const fileUrl = pathToFileURL(resolvedPath).href;

      // Dynamically import the handler module
      const importedModule = await import(fileUrl);

      // Register in ESM resolver cache
      registerHandlerModule(module.absolutePath, importedModule);
      if (resolvedPath !== module.absolutePath) {
        registerHandlerModule(resolvedPath, importedModule);
      }

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
