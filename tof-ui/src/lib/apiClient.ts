import axios, { AxiosError } from "axios";

/** Backend hata sözleşmesi: { error: { code, message } } */
export interface ApiErrorShape {
  code: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** Tek merkezi axios istemcisi. Session cookie için withCredentials. */
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Cookie'den değer oku (CSRF token'ı için). */
function readCookie(name: string): string | null {
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + escaped + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

// CSRF: mutasyon isteklerinde XSRF-TOKEN cookie'sini X-CSRF-Token header'ı yap.
// Backend bu header'ı session'daki token ile karşılaştırır (Csrf::verify).
api.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const token = readCookie("XSRF-TOKEN");
    if (token) config.headers.set("X-CSRF-Token", token);
  }
  return config;
});

// Hataları tek tip ApiError'a çevir (UI'da e.code / e.message kullanılabilir).
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: ApiErrorShape }>) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const code = data?.error?.code ?? "network_error";
    const message =
      code === "csrf_mismatch"
        ? "Oturum doğrulaması geçersiz. Lütfen sayfayı yenileyip tekrar deneyin."
        : (data?.error?.message ??
          error.message ??
          "Beklenmeyen bir hata oluştu.");
    return Promise.reject(new ApiError(message, code, status));
  },
);
