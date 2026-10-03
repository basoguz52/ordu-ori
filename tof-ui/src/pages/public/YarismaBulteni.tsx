import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  Search,
  FileText,
  ListChecks,
  Users,
} from "lucide-react";
import {
  useEvents,
  regStatus,
  REG_STATUS_META,
  type EventItem,
} from "@/api/events";
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

function PdfLink({ href, label }: { href?: string; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      <FileText /> {label}
    </a>
  );
}

function EventCard({ e, highlight }: { e: EventItem; highlight?: boolean }) {
  const status = regStatus(e);
  const meta = REG_STATUS_META[status];

  return (
    <Card
      id={`event-${e.id}`}
      className={cn(
        "flex scroll-mt-24 flex-col gap-4 p-5 transition-shadow",
        highlight && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold leading-snug">{e.name}</h3>
          {e.type && (
            <Badge variant="secondary" className="font-normal">
              {e.type}
            </Badge>
          )}
        </div>
        <Badge variant={meta.variant} className="shrink-0">
          {meta.label}
        </Badge>
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0" />
          {formatDateRangeTR(e.start_date, e.end_date)}
        </div>
        {e.location && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />
            {e.location}
          </div>
        )}
      </div>

      {(e.bulletin_url || e.oncikis_url || e.kesincikis_url) && (
        <div className="flex flex-wrap gap-2">
          <PdfLink href={e.bulletin_url} label="Bülten" />
          <PdfLink href={e.oncikis_url} label="Ön Çıkış" />
          <PdfLink href={e.kesincikis_url} label="Kesin Çıkış" />
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t pt-4">
        <Link
          to={`/yarismacilar?event=${e.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <Users /> Yarışmacılar
        </Link>
        {status === "open" && (
          <Link
            to={`/yarisma-kayit?event=${e.id}`}
            className={cn(buttonVariants({ size: "sm" }), "ml-auto")}
          >
            <ListChecks /> Kayıt
          </Link>
        )}
      </div>
    </Card>
  );
}

export default function YarismaBulteni() {
  const { data, isLoading, isError } = useEvents();
  const [q, setQ] = useState("");
  const location = useLocation();

  // Takvim/anasayfadan #event-<id> ile gelince ilgili karta kaydır + vurgula
  const hashId = /^#event-(\d+)$/.exec(location.hash)?.[1] ?? null;
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (!hashId || !data) return;
    const el = document.getElementById(`event-${hashId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(hashId);
    const t = window.setTimeout(() => setHighlightId(null), 2500);
    return () => window.clearTimeout(t);
  }, [hashId, data]);

  // Sezona göre grupla (yeni sezon üstte); grup içinde kayıt açık/devam eden
  // yarışlar en üstte, sonra yaklaşanlar tarihe yakınlık sırasıyla, en altta geçmişler.
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
        title="Yarışmalar"
        description="Yaklaşan ve geçmiş yarışlar, bülten ve kayıt."
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
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Yarışlar yüklenemedi" />
      ) : groups.length === 0 ? (
        <EmptyState
          title={q ? "Sonuç bulunamadı" : "Henüz yarış eklenmemiş"}
          icon={CalendarDays}
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
              <div className="grid gap-4 lg:grid-cols-2">
                {g.items.map((e) => (
                  <EventCard
                    key={e.id}
                    e={e}
                    highlight={highlightId === String(e.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
