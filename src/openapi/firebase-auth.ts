import type { SecurityHandlers } from './index';

type AuthClient = {
  verifyIdToken: (token: string) => Promise<unknown>;
};

export type FirebaseAuthSecurityOptions = {
  /**
   * Name of the OpenAPI security scheme to attach the handler to.
   * Defaults to "bearerAuth".
   */
  securitySchemeName?: string;
  /**
   * Custom auth client for tests or alternate Firebase auth instances.
   */
  authClient?: AuthClient;
  /**
   * Token claim used for role-based checks when scopes are defined.
   * Defaults to "roles".
   */
  roleClaim?: string;
};

type FirebaseAuthModule = {
  firebaseAuthMiddleware: (options?: { authClient?: AuthClient }) => (
    req: unknown,
    res: unknown,
    next: () => void,
  ) => Promise<void> | void;
};

const loadFirebaseAuth = async (): Promise<FirebaseAuthModule> => {
  try {
    const mod = await import('@my-f-startup/firebase-auth-express');
    const provider = (mod as unknown as Record<string, unknown>).default ?? mod;
    const firebaseAuthMiddleware =
      (provider as Record<string, unknown>).firebaseAuthMiddleware;

    if (typeof firebaseAuthMiddleware !== 'function') {
      throw new Error(
        'Invalid @my-f-startup/firebase-auth-express module: missing firebaseAuthMiddleware export',
      );
    }

    return provider as FirebaseAuthModule;
  } catch (error) {
    const message =
      '@my-f-startup/firebase-auth-express is required for createFirebaseAuthSecurityHandlers. ' +
      'Install it with: npm install @my-f-startup/firebase-auth-express';
    throw new Error(message, { cause: error as Error });
  }
};

const createNullResponse = () => {
  const res: Record<string, unknown> = {};
  res.status = () => res;
  res.json = () => res;
  res.send = () => res;
  res.end = () => res;
  res.set = () => res;
  return res;
};

const runMiddleware = async (
  middleware: (req: unknown, res: unknown, next: () => void) => Promise<void> | void,
  req: unknown,
): Promise<boolean> => {
  return new Promise((resolve) => {
    let nextCalled = false;
    const res = createNullResponse();
    const next = () => {
      nextCalled = true;
      resolve(true);
    };

    Promise.resolve(middleware(req, res, next))
      .then(() => {
        if (!nextCalled) resolve(false);
      })
      .catch(() => resolve(false));
  });
};

export const createFirebaseAuthSecurityHandlers = (
  options: FirebaseAuthSecurityOptions = {},
): SecurityHandlers => {
  const securitySchemeName = options.securitySchemeName ?? 'bearerAuth';
  const roleClaim = options.roleClaim ?? 'roles';

  return {
    [securitySchemeName]: async (req, scopes, _schema) => {
      const { firebaseAuthMiddleware } = await loadFirebaseAuth();
      const middleware = firebaseAuthMiddleware({
        authClient: options.authClient,
      });

      const isAuthenticated = await runMiddleware(middleware, req);
      if (!isAuthenticated) return false;

      if (!scopes.length) return true;

      const roles = (req as Record<string, any>)?.auth?.token?.[roleClaim];
      if (!Array.isArray(roles)) return false;

      return scopes.every((scope: string) => roles.includes(scope));
    },
  };
};
