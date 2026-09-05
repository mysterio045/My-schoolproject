/**
 * Centralized API error types and message extraction.
 *
 * The FastAPI backend returns errors in a few shapes:
 *   - `{ "detail": "message" }`               (common: 400/401/403/404/409/500)
 *   - `{ "detail": [ { "loc", "msg", "type" } ] }` (422 validation)
 *
 * We never surface stack traces or raw backend internals to the UI; 5xx maps to
 * a generic message.
 */

export interface FastApiValidationIssue {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** Human-readable validation messages extracted from a 422 payload. */
  get validationMessages(): string[] {
    if (!this.isValidationError) {
      return [];
    }
    const detail = this.detail;
    if (Array.isArray(detail)) {
      return detail
        .map((issue) => {
          const i = issue as FastApiValidationIssue;
          const field =
            Array.isArray(i?.loc) && i.loc.length > 1
              ? i.loc[i.loc.length - 1]
              : undefined;
          return field ? `${i.msg} (${field})` : i.msg;
        })
        .filter(Boolean);
    }
    return [];
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request. Please check the submitted data.",
  401: "You are not authenticated or your session has expired.",
  403: "You are not authorized to perform this action.",
  404: "The requested resource was not found.",
  409: "The request conflicts with the current state of the resource.",
  422: "The submitted data is invalid.",
  429: "Too many requests. Please try again shortly.",
};

/**
 * Build a safe, user-facing message from a failed HTTP response payload.
 */
export function extractErrorMessage(status: number, detail: unknown): string {
  if (status === 422) {
    const payload = detail as { detail?: unknown };
    const issues = payload?.detail;
    if (Array.isArray(issues)) {
      const messages = issues
        .map((issue) => (issue as FastApiValidationIssue)?.msg)
        .filter((m): m is string => typeof m === "string" && m.length > 0);
      if (messages.length > 0) {
        return messages.join(". ");
      }
    }
    return STATUS_MESSAGES[422];
  }

  if (detail && typeof detail === "object") {
    const payload = detail as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  }

  return STATUS_MESSAGES[status] ?? "Something went wrong. Please try again.";
}

const GENERIC_MESSAGE = "Unable to reach the server. Please try again.";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "The request was cancelled.";
    }
    // TypeError from fetch = network failure (no response at all).
    return GENERIC_MESSAGE;
  }
  if (typeof error === "string") {
    return error;
  }
  return GENERIC_MESSAGE;
}