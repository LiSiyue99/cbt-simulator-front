export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

let tokenProvider: (() => string | null) | null = null;

/**
 * setTokenProvider - 设置获取 Bearer Token 的提供者
 * 用于在每次请求时动态注入 Authorization 头
 */
export function setTokenProvider(provider: () => string | null) {
  tokenProvider = provider;
}

function buildUrl(url: string, query?: RequestOptions["query"]): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const u = new URL(base + url);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    });
  }
  return u.toString();
}

async function withTimeout<T>(p: Promise<T>, timeoutMs = 30000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new ApiError("request timeout", "timeout", 0)), timeoutMs);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

/**
 * httpRequest - 统一的 HTTP 请求函数
 * - 自动注入 Authorization Bearer token
 * - 统一的 JSON 处理、错误抛出与超时
 */
export async function httpRequest<T>(method: HttpMethod, url: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = tokenProvider ? tokenProvider() : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const fullUrl = buildUrl(url, options.query);

  let attempt = 0;
  let resp: Response | null = null;
  let lastErr: unknown = null;
  const maxRetries = 1; // 对 429 做一次退避重试（仅 GET）
  const isIdempotent = method === "GET";

  while (attempt <= maxRetries) {
    try {
      resp = await withTimeout(fetch(fullUrl, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: "no-store",
      }), options.timeoutMs);
      if (resp.status !== 429) break;
      if (!isIdempotent || attempt === maxRetries) break;
      const retryAfter = Number(resp.headers.get("Retry-After")) || 500;
      await new Promise((r) => setTimeout(r, retryAfter));
    } catch (e) {
      lastErr = e;
      if (!isIdempotent || attempt === maxRetries) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
    attempt++;
  }
  if (!resp) throw lastErr ?? new ApiError("network error", "network_error", 0);

  const contentType = resp.headers.get("Content-Type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await resp.json().catch(() => ({})) : await resp.text();

  if (!resp.ok) {
    const code = (data && (data as any).code) || String(resp.status);
    const message = (data && (data as any).error) || resp.statusText || "request failed";
    throw new ApiError(message, code, resp.status, data);
  }

  return data as T;
}

/**
 * httpGet - GET 请求
 */
export function httpGet<T>(url: string, options?: Omit<RequestOptions, "body">) {
  return httpRequest<T>("GET", url, options);
}

/**
 * httpPost - POST 请求（JSON）
 */
export function httpPost<T>(url: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
  return httpRequest<T>("POST", url, { ...(options || {}), body });
}

/**
 * httpPut - PUT 请求（JSON）
 */
export function httpPut<T>(url: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
  return httpRequest<T>("PUT", url, { ...(options || {}), body });
}
