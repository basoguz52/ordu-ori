import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Download,
  Trash2,
  AlertCircle,
  Users,
} from "lucide-react";
import { useEvent } from "@/api/events";
import {
  useEventRegistrations,
  useUpdateRegistrationStatus,
  useDeleteEventRegistration,
  REG_STATUS_LABELS,
  type RegistrationRow,
  type RegStatusValue,
} from "@/api/registrations";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateRangeTR } from "@/lib/format";
import { cn } from "@/lib/utils";

function fullName(r: RegistrationRow) {
  return [r.first_name, r.last_name].filter(Boolean).join(" ") || "—";
}

function isRegStatus(v: string): v is RegStatusValue {
  return v === "pending" || v === "approved" || v === "cancelled";
}

function RegRow({
  eventId,
  r,
  onError,
}: {
  eventId: string;
  r: RegistrationRow;
  onError: (msg: string | null) => void;
}) {
  const updateStatus = useUpdateRegistrationStatus(eventId);
  const remove = useDeleteEventRegistration(eventId);
  const status = isRegStatus(r.status) ? r.status : "pending";
  const meta = REG_STATUS_LABELS[status];
  const busy = updateStatus.isPending || remove.isPending;

  async function handleStatus(next: string) {
    if (!isRegStatus(next) || next === status) return;
    onError(null);
    try {
      await updateStatus.mutateAsync({ id: r.id, status: next });
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "Durum güncellenemedi.");
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${fullName(r)} kaydı silinsin mi?`)) return;
    onError(null);
    try {
      await remove.mutateAsync(r.id);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "Kayıt silinemedi.");
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{fullName(r)}</span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          {r.club_name && <span>{r.club_name}</span>}
          {(r.category_code || r.category_name) && (
            <span>
              {r.category_code ? `${r.category_code} · ` : ""}
              {r.category_name}
            </span>
          )}
          {r.si_chip_no && <span>Chip: {r.si_chip_no}</span>}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <NativeSelect
          value={status}
          disabled={busy}
          onChange={(e) => handleStatus(e.target.value)}
          className="h-9 w-36"
        >
          <option value="approved">Onaylı</option>
          <option value="pending">Beklemede</option>
          <option value="cancelled">İptal</option>
        </NativeSelect>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 /> Sil
        </Button>
      </div>
    </Card>
  );
}

export default function EventRegistrations() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: event } = useEvent(id);
  const { data, isLoading, isError } = useEventRegistrations(id);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    const needle = q.trim().toLocaleLowerCase("tr");
    if (needle) {
      list = list.filter((r) =>
        [fullName(r), r.club_name ?? "", r.category_code ?? "", r.category_name ?? ""]
          .join(" ")
          .toLocaleLowerCase("tr")
          .includes(needle),
      );
    }
    return list;
  }, [data, q, statusFilter]);

  const counts = useMemo(() => {
    const c = { total: 0, approved: 0, pending: 0, cancelled: 0 };
    for (const r of data ?? []) {
      c.total++;
      if (isRegStatus(r.status)) c[r.status]++;
    }
    return c;
  }, [data]);

  return (
    <div>
      <Link
        to="/app/etkinlikler"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        <ArrowLeft /> Etkinlikler
      </Link>

      <PageHeader
        title={event ? `${event.name} — Kayıtlar` : "Kayıtlar"}
        description={
          event
            ? `${formatDateRangeTR(event.start_date, event.end_date)} · ${event.location}`
            : undefined
        }
        actions={
          <a
            href={`/api/events/${id}/registrations/export-csv`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download /> CSV indir
          </a>
        }
      />

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sporcu, kulüp veya kategori ara…"
            className="pl-9"
          />
        </div>
        <NativeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-48"
        >
          <option value="all">Tümü ({counts.total})</option>
          <option value="approved">Onaylı ({counts.approved})</option>
          <option value="pending">Beklemede ({counts.pending})</option>
          <option value="cancelled">İptal ({counts.cancelled})</option>
        </NativeSelect>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Kayıtlar yüklenemedi" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            q || statusFilter !== "all" ? "Sonuç bulunamadı" : "Henüz kayıt yok"
          }
          icon={Users}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RegRow key={r.id} eventId={id} r={r} onError={setError} />
          ))}
        </div>
      )}
    </div>
  );
}
