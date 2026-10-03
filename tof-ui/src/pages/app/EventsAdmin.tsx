import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  CalendarDays,
  MapPin,
  Pencil,
  Trash2,
  Users,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import {
  useEvents,
  useDeleteEvent,
  regStatus,
  REG_STATUS_META,
  type EventItem,
} from "@/api/events";
import { groupBySeason } from "@/lib/season";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateRangeTR } from "@/lib/format";
import { cn } from "@/lib/utils";

function EventRow({
  e,
  onDelete,
  deleting,
}: {
  e: EventItem;
  onDelete: (e: EventItem) => void;
  deleting: boolean;
}) {
  const status = regStatus(e);
  const meta = REG_STATUS_META[status];

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold leading-snug">{e.name}</h3>
          <Badge variant={meta.variant} className="shrink-0">
            {meta.label}
          </Badge>
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
        <Link
          to={`/app/etkinlikler/${e.id}/kayitlar`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <Users /> Kayıtlar
        </Link>
        <Link
          to={`/app/etkinlikler/${e.id}/dosyalar`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <FolderOpen /> Dosyalar
        </Link>
        <Link
          to={`/app/etkinlikler/${e.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Pencil /> Düzenle
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={deleting}
          onClick={() => onDelete(e)}
        >
          <Trash2 /> Sil
        </Button>
      </div>
    </Card>
  );
}

export default function EventsAdmin() {
  const { data, isLoading, isError } = useEvents();
  const deleteEvent = useDeleteEvent();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  async function handleDelete(e: EventItem) {
    if (
      !window.confirm(
        `"${e.name}" silinsin mi?\n\nBu yarışın tüm kayıtları ve sonuçları da silinecek. Bu işlem geri alınamaz.`,
      )
    ) {
      return;
    }
    setError(null);
    setDeletingId(e.id);
    try {
      await deleteEvent.mutateAsync(e.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Etkinlik silinemedi.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Etkinlikler"
        description="Yarışları oluştur, düzenle ve kayıtları yönet."
        actions={
          <Link to="/app/etkinlikler/yeni" className={buttonVariants({ size: "sm" })}>
            <Plus /> Yeni Yarış
          </Link>
        }
      />

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Etkinlikler yüklenemedi" />
      ) : groups.length === 0 ? (
        <EmptyState
          title={q ? "Sonuç bulunamadı" : "Henüz yarış yok"}
          description={q ? undefined : "İlk yarışı oluşturmak için “Yeni Yarış”a tıkla."}
          icon={CalendarDays}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">{g.label}</h2>
                <span className="text-sm text-muted-foreground">
                  {g.items.length} yarış
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {g.items.map((e) => (
                <EventRow
                  key={e.id}
                  e={e}
                  onDelete={handleDelete}
                  deleting={deletingId === e.id}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
