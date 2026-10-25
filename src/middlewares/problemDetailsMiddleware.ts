import type { NextFunction, Request, Response } from 'express';
import { ProblemDocument } from 'http-problem-details';
import { sendProblem, type ErrorToProblemDetailsMapping } from '..';
import { type Logger, safeLog } from '../observability';

export const problemDetailsMiddleware =
  (mapError?: ErrorToProblemDetailsMapping, logger?: Logger) =>
  (
    error: Error,
    request: Request,
    response: Response,
    _next: NextFunction,
  ): void => {
    let problemDetails: ProblemDocument | undefined;

    if (mapError) problemDetails = mapError(error, request);

    problemDetails =
      problemDetails ?? defaultErrorToProblemDetailsMapping(error);

    if (problemDetails.status >= 500) {
      safeLog.error(logger, 'Server error', error);
    } else {
      safeLog.warn(logger, 'Client error', error);
    }

    sendProblem(response, problemDetails.status, { problem: problemDetails });
  };

export const defaultErrorToProblemDetailsMapping = (
  error: Error,
): ProblemDocument => {
  let statusCode = 500;

  // Prefer standard `status` code if present (e.g., express-openapi-validator)
  const errObj = error as unknown as Record<string, unknown>;
  const maybeStatus = errObj['status'];
  if (
    typeof maybeStatus === 'number' &&
    maybeStatus >= 100 &&
    maybeStatus < 600
  ) {
    statusCode = maybeStatus;
  }

  const maybeStatusCode = errObj['statusCode'];
  if (
    typeof maybeStatusCode === 'number' &&
    maybeStatusCode >= 100 &&
    maybeStatusCode < 600
  ) {
    statusCode = maybeStatusCode;
  }

  const maybeErrorCode = errObj['errorCode'];
  if (
    typeof maybeErrorCode === 'number' &&
    maybeErrorCode >= 100 &&
    maybeErrorCode < 600
  ) {
    statusCode = maybeErrorCode;
  }

  // The message of the event store conflict names the stream and its versions
  if (error.name === VERSION_CONFLICT_ERROR_NAME) {
    return new ProblemDocument(
      { detail: VERSION_CONFLICT_DETAIL, status: statusCode },
      { code: VERSION_CONFLICT_CODE },
    );
  }

  return new ProblemDocument({
    detail: error.message,
    status: statusCode,
  });
};

// Matched by name so this library does not depend on the event store packages
const VERSION_CONFLICT_ERROR_NAME = 'ExpectedVersionConflictError';
const VERSION_CONFLICT_CODE = 'VERSION_CONFLICT';
const VERSION_CONFLICT_DETAIL =
  'The resource was changed by another request. Reload it and try again.';
