import { trace, SpanStatusCode } from '@opentelemetry/api';
import { type NextFunction, type Request, type Response } from 'express';
import {
  send,
  sendAccepted,
  sendCreated,
  sendProblem,
  type AcceptedHttpResponseOptions,
  type CreatedHttpResponseOptions,
  type HttpProblemResponseOptions,
  type HttpResponseOptions,
  type NoContentHttpResponseOptions,
} from '.';

const tracer = trace.getTracer('@emmett-community/emmett-expressjs-with-openapi');

// #region httpresponse-on
export type HttpResponse = (response: Response) => void;

export type HttpHandler<RequestType extends Request> = (
  request: RequestType,
) => Promise<HttpResponse> | HttpResponse;

export const on =
  <RequestType extends Request>(handle: HttpHandler<RequestType>) =>
  async (
    request: RequestType,
    response: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const setResponse = await Promise.resolve(handle(request));

    return setResponse(response);
  };
// #endregion httpresponse-on

/**
 * Options for the traced handler wrapper.
 */
export type TracedHandlerOptions = {
  /**
   * Custom span name. Defaults to 'emmett.http.handle_request'.
   */
  spanName?: string;
};

/**
 * Wraps an HTTP handler with OpenTelemetry tracing.
 * Creates a span that captures request method, route, and response status.
 *
 * If OpenTelemetry is not initialized by the application, spans are no-ops
 * with zero overhead.
 *
 * @example
 * ```typescript
 * router.post('/carts', tracedOn(async (req) => {
 *   // Your handler logic
 *   return Created({ createdId: cartId });
 * }));
 * ```
 */
export const tracedOn =
  <RequestType extends Request>(
    handle: HttpHandler<RequestType>,
    options?: TracedHandlerOptions,
  ) =>
  async (
    request: RequestType,
    response: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const spanName = options?.spanName ?? 'emmett.http.handle_request';

    return tracer.startActiveSpan(spanName, async (span) => {
      try {
        span.setAttribute('http.method', request.method);

        const route =
          (request.baseUrl ?? '') +
          ((request.route as { path?: string })?.path ?? request.path);
        span.setAttribute('http.route', route);

        const setResponse = await Promise.resolve(handle(request));
        setResponse(response);

        span.setAttribute('http.status_code', response.statusCode);
        span.setStatus({
          code:
            response.statusCode >= 400 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
        });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  };

export const OK =
  (options?: HttpResponseOptions): HttpResponse =>
  (response: Response) => {
    send(response, 200, options);
  };

export const Created =
  (options: CreatedHttpResponseOptions): HttpResponse =>
  (response: Response) => {
    sendCreated(response, options);
  };

export const Accepted =
  (options: AcceptedHttpResponseOptions): HttpResponse =>
  (response: Response) => {
    sendAccepted(response, options);
  };

export const NoContent = (
  options?: NoContentHttpResponseOptions,
): HttpResponse => HttpResponse(204, options);

export const HttpResponse =
  (statusCode: number, options?: HttpResponseOptions): HttpResponse =>
  (response: Response) => {
    send(response, statusCode, options);
  };

/////////////////////
// ERRORS
/////////////////////

export const BadRequest = (
  options?: HttpProblemResponseOptions,
): HttpResponse => HttpProblem(400, options);

export const Forbidden = (options?: HttpProblemResponseOptions): HttpResponse =>
  HttpProblem(403, options);

export const NotFound = (options?: HttpProblemResponseOptions): HttpResponse =>
  HttpProblem(404, options);

export const Conflict = (options?: HttpProblemResponseOptions): HttpResponse =>
  HttpProblem(409, options);

export const PreconditionFailed = (
  options: HttpProblemResponseOptions,
): HttpResponse => HttpProblem(412, options);

export const HttpProblem =
  (statusCode: number, options?: HttpProblemResponseOptions): HttpResponse =>
  (response: Response) => {
    sendProblem(response, statusCode, options);
  };
