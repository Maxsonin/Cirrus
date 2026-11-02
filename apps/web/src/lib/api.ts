const API_URL = import.meta.env.VITE_API_URL;

export const GENERIC_ERROR = 'Something went wrong. Please try again later.';
const NETWORK_ERROR = 'Can’t reach the server. Check your connection.';

export class ApiError extends Error {
  readonly status: number;
  readonly userMessage: string;

  constructor(
    status: number,
    userMessage: string,
    detail: string,
    cause?: unknown,
  ) {
    super(detail, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.userMessage = userMessage;
  }
}

// TODO: make a better Error handling in both API and React
export async function apiFetch(path: string, init?: RequestInit) {
  const request = `${init?.method ?? 'GET'} ${path}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...init,
    });
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    throw new ApiError(0, NETWORK_ERROR, `${request}: network error`, err);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const serverMessage =
      typeof body?.error === 'string' ? body.error : undefined;

    throw new ApiError(
      response.status,
      // Only 4xx messages are written for users; 5xx is always generic.
      response.status < 500 && serverMessage ? serverMessage : GENERIC_ERROR,
      `${request}: ${response.status} ${serverMessage ?? response.statusText}`,
    );
  }

  return response;
}

export async function apiJson<T>(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init);
  try {
    return (await response.json()) as T;
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    throw new ApiError(
      response.status,
      GENERIC_ERROR,
      `${path}: invalid JSON`,
      err,
    );
  }
}

/** The only way the UI should turn an error into text. */
export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.userMessage : GENERIC_ERROR;
}

/** 4xx won't succeed on retry; network errors and 5xx might. */
export function isRetryable(error: unknown) {
  return (
    !(error instanceof ApiError) || error.status === 0 || error.status >= 500
  );
}
