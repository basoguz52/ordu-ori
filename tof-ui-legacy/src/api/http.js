export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    // Session-cookie kullanacaksak:
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP_${res.status}`);
  }

  // boş body olasılığı
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  return res.json();
}
