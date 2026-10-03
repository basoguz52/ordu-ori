import { useMemo, useState } from "react";
import {
  Search,
  Trophy,
  FileText,
  Clock,
  ListOrdered,
  Radio,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { useEvents, type EventItem } from "@/api/events";
import {
  useResultProbes,
  resultFileUrl,
  LIVE_RESULTS_URL,
  type ResultProbe,
} from "@/api/results";
import { groupBySeason } from "@/lib/season";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { formatDateRangeTR } from "@/lib/format";
import { cn } from "@/lib/utils";

function ResultLink({
  href,
  label,
  icon: Icon,
  variant = "outline",
}: {
  href: string;
  label: string;
  icon: typeof FileText;
  variant?: "default" | "secondary" | "outline";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants({ variant, size: "sm" }))}
    >
      <Icon /> {label}
    </a>
  );
}

function EventCard({ e, probe }: { e: EventItem; probe?: ResultProbe }) {
  const key = e.folder_key;
  const has = {
    overall: !!key && !!probe?.overall,
    official: !!key && !!probe?.official,
    splits: !!key && !!probe?.splits,
  };
  const anyResult = has.overall || has.official || has.splits;

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold leading-snug">{e.name}</h3>
          {e.type && (
            <Badge variant="secondary" className="font-normal">
              {e.type}
            </Badge>
          )}
        </div>
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

      <div className="flex shrink-0 flex-wrap gap-2">
        {anyResult ? (
          <>
            {has.overall && (
              <ResultLink
                href={resultFileUrl(key!, "overall")}
                label="Toplu Sonuçlar"
                icon={Trophy}
                variant="default"
              />
            )}
            {has.official && (
              <ResultLink
                href={resultFileUrl(key!, "official")}
                label="Genel"
                icon={ListOrdered}
                variant="secondary"
              />
            )}
            {has.splits && (
              <ResultLink
                href={resultFileUrl(key!, "splits")}
                label="Ara Zaman"
                icon={Clock}
              />
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            Sonuç dosyası yok
          </span>
        )}
      </div>
    </Card>
  );
}

export default function Sonuclar() {
  const { data, isLoading, isError } = useEvents();
  const [q, setQ] = useState("");

  const keys = useMemo(
    () => (data ?? []).map((e) => e.folder_key).filter((k): k is string => !!k),
    [data],
  );
  const { data: probes } = useResultProbes(keys);

  // Sezona göre grupla (yeni sezon üstte); grup içinde devam eden/yaklaşan
  // yarışlar üstte, geçmişler yeniden eskiye.
  const groups = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLocaleLowerCase("tr");
    const filtered = needle
      ? data.filter((e) =>
          [e.name, e.location, e.type ?? ""]
            .join(" ")
            .toLocaleLowerCase("tr")
            .includes(needle),
        )
      : data;

    return groupBySeason(filtered);
  }, [data, q]);

  return (
    <div>
      <PageHeader
        title="Sonuçlar"
        description="Geçmiş yarışların resmi sonuçları, genel klasman ve ara zamanları."
        actions={
          <a
            href={LIVE_RESULTS_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            <Radio /> Canlı Sonuçlar
          </a>
        }
      />

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Yarış, yer veya tür ara…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Sonuçlar yüklenemedi" />
      ) : groups.length === 0 ? (
        <EmptyState
          title={q ? "Sonuç bulunamadı" : "Henüz yarış eklenmemiş"}
          icon={Trophy}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">{g.label}</h2>
                <span className="text-sm text-muted-foreground">
                  {g.items.length} yarış
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {g.items.map((e) => (
                  <EventCard key={e.id} e={e} probe={probes?.[e.folder_key ?? ""]} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
