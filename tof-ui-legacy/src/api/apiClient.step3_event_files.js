import { apiFetch } from "./http";

// FormData / multipart istekleri için (Content-Type set etmeyin)
async function apiFetchForm(url, formData, { method = "POST" } = {}) {
  const res = await fetch(url, {
    method,
    body: formData,
    credentials: "include",
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      res.statusText ||
      "İstek hatası";
    throw new Error(msg);
  }

  return data;
}

export const apiClient = {
  // Auth
  login(email, password) {
    return apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  me() {
    return apiFetch("/api/me", { method: "GET" });
  },
  logout() {
    return apiFetch("/api/logout", { method: "POST" });
  },

  // Events
  async listEvents({ q } = {}) {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    const data = await apiFetch(`/api/events${qs}`);
    return data.items;
  },

  async createEvent(payload) {
    return apiFetch("/api/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateEvent(id, patch) {
    await apiFetch(`/api/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    return true;
  },

  async deleteEvent(id) {
    await apiFetch(`/api/events/${id}`, { method: "DELETE" });
    return true;
  },

  async getEvent(eventId) {
    const data = await apiFetch(`/api/events/${eventId}`);
    return data.item;
  },

  // --- Uploads (event_files)
  async uploadEventBulletin(eventId, file) {
    const fd = new FormData();
    fd.append("bulletin", file);
    return apiFetchForm(`/api/events/${eventId}/bulletin`, fd, { method: "POST" });
  },

  async uploadEventOnCikis(eventId, file) {
    const fd = new FormData();
    fd.append("oncikis", file);
    return apiFetchForm(`/api/events/${eventId}/oncikis`, fd, { method: "POST" });
  },

  async uploadEventKesinCikis(eventId, file) {
    const fd = new FormData();
    fd.append("kesincikis", file);
    return apiFetchForm(`/api/events/${eventId}/kesincikis`, fd, { method: "POST" });
  },

  async deleteEventBulletin(eventId) {
    await apiFetch(`/api/events/${eventId}/bulletin`, { method: "DELETE" });
    return true;
  },

  async deleteEventOnCikis(eventId) {
    await apiFetch(`/api/events/${eventId}/oncikis`, { method: "DELETE" });
    return true;
  },

  async deleteEventKesinCikis(eventId) {
    await apiFetch(`/api/events/${eventId}/kesincikis`, { method: "DELETE" });
    return true;
  },
};
