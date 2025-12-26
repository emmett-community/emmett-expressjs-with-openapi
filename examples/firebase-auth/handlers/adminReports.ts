/**
 * Operation handlers for admin reports.
 */

import type { AuthenticatedRequest } from '@my-f-startup/firebase-auth-express';
import type { Response } from 'express';

export const getAdminReports = (req: AuthenticatedRequest, res: Response) => {
  res.json({
    totalUsers: 42,
    totalRevenue: 12345.67,
    uid: req.auth?.uid,
  });
};
