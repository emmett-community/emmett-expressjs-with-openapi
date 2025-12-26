/**
 * Operation handlers for profile endpoints.
 */

import type { AuthenticatedRequest } from '@my-f-startup/firebase-auth-express';
import type { Response } from 'express';

export const getProfile = (req: AuthenticatedRequest, res: Response) => {
  res.json({
    uid: req.auth?.uid,
    roles: req.auth?.token?.roles ?? [],
  });
};
