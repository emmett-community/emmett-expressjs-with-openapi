import type { Request } from 'express';
import { OK, on } from '../../../../src';

export const getProfile = on(async (request: Request) => {
  const auth = (request as Record<string, any>).auth ?? {};

  return OK({
    body: {
      uid: auth.uid ?? null,
      roles: auth.token?.roles ?? [],
    },
  });
});
