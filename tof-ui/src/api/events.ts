import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface EventItem {
  id: number;
  name: string;
  description: string | null;
  type: string | null;
  start_date: string;
  end_date: string;
  location: string;
  is_registration_open: number;
  registration_start_at: string | null;
  registration_end_at: string | null;
  slug: string | null;
  folder_key: string | null;
  season_start_year: number | null;
  season_end_year: number | null;
  bulletin_url?: string;
  oncikis_url?: string;
  kesincikis_url?: string;
}

export type RegStatus = "open" | "closed" | "not_started" | "ended";

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Backend kayıt kuralıyla birebir: is_registration_open + pencere (start/end). */
export function regStatus(e: EventItem, now: Date = new Date()): RegStatus {
  if (!e.is_registration_open) return "closed";
  const start = toDate(e.registration_start_at);
  const end = toDate(e.registration_end_at);
  if (start && now < start) return "not_started";
  if (end && now > end) return "ended";
  return "open";
}

export const REG_STATUS_META: Record<
  RegStatus,
  { label: string; variant: "success" | "muted" | "warning" | "destructive" }
> = {
  open: { label: "Kayıt Açık", variant: "success" },
  not_started: { label: "Başlamadı", variant: "warning" },
  ended: { label: "Kayıt Bitti", variant: "muted" },
  closed: { label: "Kayıt Kapalı", variant: "muted" },
};

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await api.get<{ items: EventItem[] }>("/events");
      return data.items;
    },
  });
}

export function useEvent(id: number | string | undefined) {
  return useQuery({
    queryKey: ["event", String(id)],
    enabled: id !== undefined && id !== "" && !Number.isNaN(Number(id)),
    queryFn: async () => {
      const { data } = await api.get<{ item: EventItem }>(`/events/${id}`);
      return data.item;
    },
  });
}

// --- Admin (panel) mutasyonları -------------------------------------------

/** Backend create/update gövdesi. Partial update: sadece dolu alanlar gönderilir. */
export interface EventInput {
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  description?: string | null;
  type?: string | null;
  is_registration_open: number;
  registration_start_at?: string | null;
  registration_end_at?: string | null;
  season_start_year?: number | null;
  season_end_year?: number | null;
}

export type EventFileKind = "bulletin" | "oncikis" | "kesincikis";

function invalidateEvents(qc: ReturnType<typeof useQueryClient>, id?: number | string) {
  qc.invalidateQueries({ queryKey: ["events"] });
  if (id !== undefined) qc.invalidateQueries({ queryKey: ["event", String(id)] });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EventInput) => {
      const { data } = await api.post<{ id: number; folder_key: string }>(
        "/events",
        input,
      );
      return data;
    },
    onSuccess: () => invalidateEvents(qc),
  });
}

export function useUpdateEvent(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<EventInput>) => {
      await api.put(`/events/${id}`, input);
    },
    onSuccess: () => invalidateEvents(qc, id),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/events/${id}`);
    },
    onSuccess: () => invalidateEvents(qc),
  });
}

export function useUploadEventFile(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { kind: EventFileKind; file: File }) => {
      const fd = new FormData();
      fd.append(vars.kind, vars.file);
      const { data } = await api.post<{ url: string }>(
        `/events/${id}/${vars.kind}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => invalidateEvents(qc, id),
  });
}

export function useDeleteEventFile(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kind: EventFileKind) => {
      await api.delete(`/events/${id}/${kind}`);
    },
    onSuccess: () => invalidateEvents(qc, id),
  });
}

// --- Dosya meta listesi (admin) --------------------------------------------

/** event_files'taki güncel kayıtların meta bilgisi (SKB dahil). */
export interface EventFileMeta {
  kind: string;
  original_name: string | null;
  size_bytes: number | null;
  version: number;
  created_at: string;
}

export function useEventFiles(id: number | string | undefined) {
  return useQuery({
    queryKey: ["event-files", String(id)],
    enabled: id !== undefined && !Number.isNaN(Number(id)),
    queryFn: async () => {
      const { data } = await api.get<{ items: EventFileMeta[] }>(
        `/events/${id}/files`,
      );
      return data.items;
    },
  });
}

// --- SKB: gizli yönetim dosyası --------------------------------------------

/** Admin indirme ucu; public sitede bu dosyaya hiçbir link verilmez. */
export function skbDownloadUrl(id: number | string): string {
  return `/api/events/${id}/skb`;
}

function invalidateEventFiles(
  qc: ReturnType<typeof useQueryClient>,
  id: number | string,
) {
  qc.invalidateQueries({ queryKey: ["event-files", String(id)] });
}

export function useUploadSkb(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("skb", file);
      const { data } = await api.post<{ original_name: string }>(
        `/events/${id}/skb`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => invalidateEventFiles(qc, id),
  });
}

export function useDeleteSkb(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/events/${id}/skb`);
    },
    onSuccess: () => invalidateEventFiles(qc, id),
  });
}

// --- Sonuç dosyaları (OE2010 çıktıları) ------------------------------------

export type ResultFileType = "official" | "splits" | "overall";

function invalidateResults(
  qc: ReturnType<typeof useQueryClient>,
  id: number | string,
) {
  qc.invalidateQueries({ queryKey: ["result-probes"] });
  invalidateEventFiles(qc, id);
}

export function useUploadResultFile(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { type: ResultFileType; file: File }) => {
      const fd = new FormData();
      fd.append("file", vars.file);
      const { data } = await api.post<{ type: string; url: string }>(
        `/events/${id}/results/${vars.type}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => invalidateResults(qc, id),
  });
}

export function useDeleteResultFile(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (type: ResultFileType) => {
      await api.delete(`/events/${id}/results/${type}`);
    },
    onSuccess: () => invalidateResults(qc, id),
  });
}

// --- Gizli depolama sağlık kontrolü ----------------------------------------

export interface StorageCheck {
  root: string | null;
  mode: "env" | "outside_webroot" | "htaccess_guarded" | "none";
  writable: boolean;
  /** true: dosya web'den indirilebiliyor (güvensiz), false: engellendi, null: public URL yok */
  http_accessible: boolean | null;
  checked_url: string | null;
}

export function useStorageCheck() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<StorageCheck>("/admin/storage-check");
      return data;
    },
  });
}
