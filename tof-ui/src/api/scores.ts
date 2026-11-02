import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

/* ------------------------------ Public ------------------------------ */

export type ScoreStatus = "OK" | "DNS" | "DNF" | "MP" | "DSQ" | "OT" | "NC";

export interface StageResult {
  time_sec: number | null;
  status: ScoreStatus;
  position: number | null;
  points: number;
}

export interface ScoreEntry {
  name: string;
  club_name: string | null;
  total: number;
  /** Toplam puana göre sıra; 0 puan alanlarda null. */
  rank: number | null;
  /** Anahtar: gün numarası ("1", "2", ...) */
  results: Record<string, StageResult>;
}

export interface ScoreCategory {
  code: string;
  name: string;
  entries: ScoreEntry[];
}

export interface EventScores {
  event_id: number;
  stages: number[];
  categories: ScoreCategory[];
}

export const STATUS_LABEL: Record<ScoreStatus, string> = {
  OK: "",
  DNS: "Başlamadı",
  DNF: "Bitirmedi",
  MP: "Eksik kontrol",
  DSQ: "Diskalifiye",
  OT: "Süre aşımı",
  NC: "Sıralama dışı",
};

/** 1757 → "29:17", 3928 → "1:05:28" */
export function formatRaceTime(sec: number | null): string {
  if (sec === null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function useEventScores(eventId: number | string | undefined) {
  return useQuery({
    queryKey: ["event-scores", String(eventId)],
    enabled: !!eventId,
    queryFn: async () => {
      const { data } = await api.get<EventScores>(`/events/${eventId}/results`);
      return data;
    },
  });
}

/* ------------------------------ Admin ------------------------------ */

export interface UnmatchedRow {
  name: string;
  club_name: string;
  category_code: string;
}

export interface ScoringStage {
  stage_no: number;
  import: {
    source: "upload" | "ftp";
    original_name: string | null;
    rows_total: number;
    rows_matched: number;
    unmatched: UnmatchedRow[];
    imported_at: string;
  } | null;
  inbox: {
    name: string;
    size_bytes: number;
    modified_at: string;
    /** İçe aktarılandan farklı (yeni) dosya */
    is_new: boolean;
  } | null;
}

export interface ScoringStatus {
  event_id: number;
  folder_key: string;
  stages: ScoringStage[];
  other_files: string[];
}

export interface ImportSummary {
  stage_no: number;
  rows_total: number;
  rows_matched: number;
  unmatched: UnmatchedRow[];
}

const statusKey = (id: number | string) => ["scoring-status", String(id)];

function invalidateScores(qc: ReturnType<typeof useQueryClient>, id: number | string) {
  qc.invalidateQueries({ queryKey: statusKey(id) });
  qc.invalidateQueries({ queryKey: ["event-scores", String(id)] });
  qc.invalidateQueries({ queryKey: ["events"] }); // has_scores
}

export function useScoringStatus(id: number | string) {
  return useQuery({
    queryKey: statusKey(id),
    queryFn: async () => {
      const { data } = await api.get<ScoringStatus>(`/admin/events/${id}/scoring`);
      return data;
    },
  });
}

export function useUploadScoreCsv(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { stage: number; file: File }) => {
      const fd = new FormData();
      fd.append("csv", vars.file);
      const { data } = await api.post<ImportSummary>(
        `/admin/events/${id}/scoring/${vars.stage}/upload`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => invalidateScores(qc, id),
  });
}

export function useImportScoreInbox(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stage: number) => {
      const { data } = await api.post<ImportSummary>(
        `/admin/events/${id}/scoring/${stage}/import`,
      );
      return data;
    },
    onSuccess: () => invalidateScores(qc, id),
  });
}

export function useDeleteScoreStage(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stage: number) => {
      await api.delete(`/admin/events/${id}/scoring/${stage}`);
    },
    onSuccess: () => invalidateScores(qc, id),
  });
}
