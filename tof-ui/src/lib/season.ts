import { regStatus, type EventItem } from "@/api/events";

/** Sezon Eylül'de başlar — backend EventController::computeSeasonYears ile birebir. */
export const SEASON_START_MONTH = 9;

export interface Season {
  start: number;
  end: number;
}

/** "YYYY-MM-DD" -> yerel Date (saat dilimi kaymasız). */
export function parseYmd(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Günün başlangıcı (saat/dakika sıfırlanmış kopya). */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Yarışın sezonu: DB'de season_start_year/season_end_year doluysa onlar,
 * yoksa start_date'ten hesaplanır (ay >= 9 ? [y, y+1] : [y-1, y]).
 */
export function eventSeason(e: EventItem): Season {
  if (e.season_start_year) {
    return {
      start: e.season_start_year,
      end: e.season_end_year ?? e.season_start_year + 1,
    };
  }
  const d = parseYmd(e.start_date);
  if (!d) return { start: 0, end: 0 };
  const y = d.getFullYear();
  return d.getMonth() + 1 >= SEASON_START_MONTH
    ? { start: y, end: y + 1 }
    : { start: y - 1, end: y };
}

export function seasonLabel(s: Season): string {
  if (!s.start) return "Tarihi belirsiz";
  return `${s.start}-${s.end} Sezonu`;
}

export type EventPhase = "running" | "upcoming" | "past";

/** Yarış bugüne göre devam ediyor mu, yaklaşıyor mu, geçti mi. */
export function eventPhase(e: EventItem, now: Date = new Date()): EventPhase {
  const today = startOfDay(now);
  const start = parseYmd(e.start_date);
  const end = parseYmd(e.end_date) ?? start;
  if (!start || !end) return "past";
  if (end < today) return "past";
  if (start > today) return "upcoming";
  return "running";
}

/** Sıralama önceliği: kayıt açık / devam eden (0) -> yaklaşan (1) -> geçmiş (2). */
function sortRank(e: EventItem, now: Date): number {
  const phase = eventPhase(e, now);
  if (phase === "running" || regStatus(e, now) === "open") return 0;
  return phase === "upcoming" ? 1 : 2;
}

/**
 * Kayıt açık/devam edenler en üstte, sonra yaklaşanlar tarihe yakınlık sırasıyla
 * (artan), en altta geçmişler (yeniden eskiye).
 */
export function compareEvents(a: EventItem, b: EventItem, now: Date = new Date()): number {
  const ra = sortRank(a, now);
  const rb = sortRank(b, now);
  if (ra !== rb) return ra - rb;
  // Geçmiş yarışlar yeniden eskiye, diğerleri tarihe yakın olan önce.
  return ra === 2
    ? b.start_date.localeCompare(a.start_date)
    : a.start_date.localeCompare(b.start_date);
}

export interface SeasonGroup {
  key: string;
  label: string;
  items: EventItem[];
}

/** Yarışları sezona göre gruplar; sezonlar yeni -> eski, içindekiler compareEvents ile. */
export function groupBySeason(events: EventItem[], now: Date = new Date()): SeasonGroup[] {
  const byKey = new Map<number, { season: Season; items: EventItem[] }>();
  for (const e of events) {
    const season = eventSeason(e);
    const group = byKey.get(season.start);
    if (group) group.items.push(e);
    else byKey.set(season.start, { season, items: [e] });
  }

  return [...byKey.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([start, g]) => ({
      key: String(start),
      label: seasonLabel(g.season),
      items: [...g.items].sort((a, b) => compareEvents(a, b, now)),
    }));
}
