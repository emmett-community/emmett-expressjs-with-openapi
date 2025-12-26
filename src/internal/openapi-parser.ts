/**
 * OpenAPI Parser for handler module discovery.
 *
 * INTERNAL MODULE - Not part of public API.
 *
 * Parses OpenAPI specifications to extract handler module paths from
 * x-eov-operation-handler fields, enabling automatic handler discovery
 * and registration.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { OpenAPIV3 } from 'express-openapi-validator/dist/framework/types';

type OpenApiDocument = OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;

export type HandlerModuleInfo = {
  moduleName: string; // e.g., "shoppingCarts"
  relativePath: string; // from x-eov-operation-handler
  absolutePath: string; // resolved full path
  operationIds: string[]; // operations using this handler
};

/**
 * Extract handler modules from OpenAPI specification.
 *
 * @param apiSpec - OpenAPI spec (file path or object)
 * @param handlersBasePath - Base path for handler modules
 * @returns Array of handler module information
 */
export async function extractHandlerModules(
  apiSpec: string | OpenApiDocument,
  handlersBasePath: string,
): Promise<HandlerModuleInfo[]> {
  // Load spec if it's a file path
  const spec =
    typeof apiSpec === 'string' ? await loadOpenApiSpec(apiSpec) : apiSpec;

  // Validate spec structure
  if (!spec.paths || typeof spec.paths !== 'object') {
    throw new Error('Invalid OpenAPI specification: missing or invalid "paths" field');
  }

  // Extract handler modules from spec
  const handlersMap = new Map<string, HandlerModuleInfo>();

  for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === 'parameters' || method === 'servers') continue;
      if (!operation || typeof operation !== 'object') continue;

      const handlerName = (operation as any)['x-eov-operation-handler'];
      const operationId =
        (operation as any)['x-eov-operation-id'] ||
        (operation as any).operationId;

      if (handlerName && typeof handlerName === 'string') {
        const absolutePath = resolveHandlerPath(
          handlersBasePath,
          handlerName,
        );

        if (!handlersMap.has(handlerName)) {
          handlersMap.set(handlerName, {
            moduleName: handlerName,
            relativePath: handlerName,
            absolutePath,
            operationIds: [],
          });
        }

        if (operationId) {
          handlersMap.get(handlerName)!.operationIds.push(operationId);
        }
      }
    }
  }

  return Array.from(handlersMap.values());
}

/**
 * Load OpenAPI specification from file.
 */
async function loadOpenApiSpec(
  filePath: string,
): Promise<OpenApiDocument> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      // Dynamic import to avoid bundling yaml if not needed
      const yaml = await import('yaml');
      return yaml.parse(content);
    } else {
      throw new Error(
        `Unsupported OpenAPI file format: ${ext}. Use .json, .yaml, or .yml`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`OpenAPI specification file not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Resolve handler module path, preventing path traversal attacks.
 */
function resolveHandlerPath(
  basePath: string,
  relativePath: string,
): string {
  // Normalize to prevent path traversal
  const normalized = path.normalize(relativePath);

  // Resolve absolute path
  const absolutePath = path.resolve(basePath, normalized);

  // Ensure path is within basePath (no escape via ../)
  const resolvedBase = path.resolve(basePath);
  if (!absolutePath.startsWith(resolvedBase)) {
    throw new Error(
      `Invalid handler path: "${relativePath}" escapes base directory`,
    );
  }

  return absolutePath;
}
