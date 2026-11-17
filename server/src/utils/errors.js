export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new ApiError(400, 'VALIDATION_ERROR', message, details);
export const unauthorized = (message = 'Sign in to continue') => new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Resource not found') => new ApiError(404, 'NOT_FOUND', message);
export const conflict = (message, details) => new ApiError(409, 'CONFLICT', message, details);

/** Safe, predictable error payloads. Internal details are never leaked. */
export function errorHandler(err, c) {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message, details: err.details ?? null } },
      err.status,
    );
  }
  if (err?.name === 'ZodError') {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Some fields need attention',
          details: err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      400,
    );
  }
  if (err?.code === 'P2002') {
    return c.json(
      { error: { code: 'CONFLICT', message: 'That record already exists', details: err.meta ?? null } },
      409,
    );
  }
  if (err?.code === 'P2025') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
  }
  console.error('[nezta-api] unhandled error', err);
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } },
    500,
  );
}
