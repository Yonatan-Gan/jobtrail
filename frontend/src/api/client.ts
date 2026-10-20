// The one place that talks HTTP. Every endpoint function goes through request().

export class ApiError extends Error {
  readonly status: number;
  // FastAPI's "detail": a message string, or a list of field errors for a 422.
  readonly detail: unknown;

  constructor(status: number, detail: unknown) {
    super(
      typeof detail === "string"
        ? detail
        : `Request failed with status ${status}`,
    );
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export type QueryParams = Record<string, string | number | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
}

export function apiUrl(path: string, query: QueryParams = {}): string {
  const base = import.meta.env.VITE_API_URL;
  if (!base) {
    throw new Error("VITE_API_URL is not set");
  }
  // The second argument lets the base be relative too (for example "/api" behind a proxy).
  const url = new URL(base.replace(/\/$/, "") + path, window.location.origin);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function request<T>(
  path: string,
  { method = "GET", body, query }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(apiUrl(path, query), {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const data: { detail?: unknown } | null = await response
      .json()
      .catch(() => null);
    throw new ApiError(response.status, data?.detail ?? response.statusText);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// A sentence for error states in the UI.
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    // fetch() rejects with a TypeError when the server can't be reached at all.
    return "Cannot reach the JobTrail API. Is the backend running?";
  }
  return error instanceof Error ? error.message : String(error);
}
