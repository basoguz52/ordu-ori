import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, MapPin, ClipboardList } from "lucide-react";
import {
  useEvents,
  regStatus,
  REG_STATUS_META,
  type EventItem,
} from "@/api/events";
import { compareEvents } from "@/lib/season";
import { RegistrationBoard } from "@/components/registration/RegistrationBoard";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRangeTR } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Kayit() {
  const { data, isLoading, isError } = useEvents();
  const [params, setParams] = useSearchParams();

  // Yalnızca kayıt penceresi açık yarışlar, tarihe yakınlık sırasıyla.
  const openEvents = useMemo(() => {
    const list = (data ?? []).filter((e) => regStatus(e) === "open");
    return [...list].sort((a, b) => compareEvents(a, b));
  }, [data]);

  const paramId = params.get("event");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Seçili yarış: URL param → kullanıcı seçimi → ilk açık yarış.
  const activeId = useMemo(() => {
    const ids = new Set(openEvents.map((e) => String(e.id)));
    if (selectedId && ids.has(selectedId)) return selectedId;
    if (paramId && ids.has(paramId)) return paramId;
    return openEvents[0] ? String(openEvents[0].id) : null;
  }, [openEvents, selectedId, paramId]);

  function select(e: EventItem) {
    const id = String(e.id);
    setSelectedId(id);
    setParams((p) => {
      p.set("event", id);
      return p;
    });
  }

  return (
    <div>
      <PageHeader
        title="Yarış Kaydı"
        description="Kayıt açık yarışlardan birini seçip sporcularınızı kaydedin."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Yarışlar yüklenemedi" />
      ) : openEvents.length === 0 ? (
        <EmptyState
          title="Şu an kayıt açık yarış yok"
          description="Kayıt penceresi açıldığında yarışlar burada listelenir."
          icon={ClipboardList}
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            {openEvents.map((e) => {
              const active = String(e.id) === activeId;
              const meta = REG_STATUS_META[regStatus(e)];
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => select(e)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent/40",
                    active &&
                      "border-primary/50 bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold leading-snug">{e.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-4 shrink-0" />
                        {formatDateRangeTR(e.start_date, e.end_date)}
                      </span>
                      {e.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-4 shrink-0" />
                          {e.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={meta.variant} className="shrink-0">
                    {meta.label}
                  </Badge>
                </button>
              );
            })}
          </div>

          {activeId && <RegistrationBoard key={activeId} eventId={activeId} />}
        </div>
      )}
    </div>
  );
}
