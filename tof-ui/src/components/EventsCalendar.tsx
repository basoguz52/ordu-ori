import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import {
  useEvents,
  regStatus,
  REG_STATUS_META,
  type EventItem,
} from "@/api/events";
import { parseYmd } from "@/lib/season";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** "YYYY-MM-DD" -> yerel gün anahtarı (saat dilimi kaymasız). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Bir etkinliğin kapsadığı tüm günlerin anahtarları (start..end dahil). */
function eventDayKeys(e: EventItem): string[] {
  const start = parseYmd(e.start_date);
  const end = parseYmd(e.end_date) ?? start;
  if (!start || !end) return [];
  const keys: string[] = [];
  const cur = new Date(start);
  // makul üst sınır: 60 gün
  for (let i = 0; i < 60 && cur <= end; i++) {
    keys.push(dayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

const eventHref = (e: EventItem) => `/yarisma-bulteni#event-${e.id}`;

function MonthGrid({
  events,
}: {
  events: EventItem[];
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  // gün -> o gün başlayan/süren etkinlikler
  const byDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      for (const k of eventDayKeys(e)) {
        const arr = map.get(k) ?? [];
        arr.push(e);
        map.set(k, arr);
      }
    }
    return map;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  // Pazartesi-başlangıçlı ofset (JS: 0=Paz)
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(today);

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          {MONTHS[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Önceki ay"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="grid size-8 place-items-center rounded-md border text-muted-foreground hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Sonraki ay"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="grid size-8 place-items-center rounded-md border text-muted-foreground hover:bg-accent"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const key = dayKey(new Date(year, month, d));
          const dayEvents = byDay.get(key);
          const isToday = key === todayKey;
          const cellContent = (
            <div
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors",
                dayEvents
                  ? "border-primary/40 bg-primary/10 font-medium text-primary hover:bg-primary/20"
                  : "border-transparent text-foreground",
                isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
              )}
            >
              <span>{d}</span>
              {dayEvents && (
                <span className="mt-0.5 size-1.5 rounded-full bg-primary" />
              )}
            </div>
          );
          return dayEvents ? (
            <Link
              key={i}
              to={eventHref(dayEvents[0])}
              title={dayEvents.map((e) => e.name).join(", ")}
            >
              {cellContent}
            </Link>
          ) : (
            <div key={i}>{cellContent}</div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingList({ events }: { events: EventItem[] }) {
  const now = new Date();
  const upcoming = useMemo(() => {
    return events
      .filter((e) => {
        const end = parseYmd(e.end_date) ?? parseYmd(e.start_date);
        return end ? end >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) : false;
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  if (upcoming.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Yaklaşan yarışma yok.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {upcoming.map((e) => {
        const st = regStatus(e, now);
        const meta = REG_STATUS_META[st];
        const start = parseYmd(e.start_date);
        return (
          <li key={e.id}>
            <Link
              to={eventHref(e)}
              className="flex items-center gap-3 py-3 transition-colors hover:bg-accent/40"
            >
              {start && (
                <div className="grid w-12 shrink-0 place-items-center rounded-lg border bg-muted/40 py-1 text-center">
                  <span className="text-base font-semibold leading-none tabular-nums">
                    {start.getDate()}
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                    {MONTHS[start.getMonth()].slice(0, 3)}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.name}</p>
                {e.location && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    {e.location}
                  </p>
                )}
              </div>
              <Badge variant={meta.variant} className="shrink-0">
                {meta.label}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function EventsCalendar({
  heading = "Yarışma Takvimi",
  hideWhenEmpty = true,
  showGridOnMobile = false,
}: {
  /** Başlık; `false` verilirse gizlenir (sayfa kendi PageHeader'ını kullanıyorsa). */
  heading?: string | false;
  /** Anasayfada olduğu gibi veri yokken hiç render etme. */
  hideWhenEmpty?: boolean;
  /** Ay ızgarasını mobilde de göster (tam sayfa kullanım). */
  showGridOnMobile?: boolean;
} = {}) {
  const { data: events, isLoading } = useEvents();
  const isEmpty = !events || events.length === 0;

  if (hideWhenEmpty && (isLoading || isEmpty)) return null;

  return (
    <section>
      {heading !== false && (
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : isEmpty ? (
        <EmptyState title="Henüz yarış eklenmemiş" icon={CalendarDays} />
      ) : (
        <>
          {/* Takvim ızgarası + yaklaşanlar yan yana (mobilde alt alta) */}
          <div
            className={cn(
              "gap-4 md:grid md:grid-cols-5",
              showGridOnMobile ? "grid" : "hidden",
            )}
          >
            <Card className="p-5 md:col-span-3">
              <MonthGrid events={events} />
            </Card>
            <Card className="p-5 md:col-span-2">
              <h3 className="mb-1 font-semibold">Yaklaşan Yarışmalar</h3>
              <UpcomingList events={events} />
            </Card>
          </div>

          {/* Mobil (yalnızca anasayfa kullanımı): sadece yaklaşanlar listesi */}
          {!showGridOnMobile && (
            <Card className="p-4 md:hidden">
              <UpcomingList events={events} />
            </Card>
          )}
        </>
      )}
    </section>
  );
}
