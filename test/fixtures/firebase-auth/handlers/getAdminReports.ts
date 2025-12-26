import type { Request } from 'express';
import { OK, on } from '../../../../src';

export const getAdminReports = on(async (_request: Request) => {
  return OK({
    body: {
      totalUsers: 42,
      totalRevenue: 1234.5,
    },
  });
});
