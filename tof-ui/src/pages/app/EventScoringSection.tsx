import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Inbox,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useScoringStatus,
  useUploadScoreCsv,
  useImportScoreInbox,
  useDeleteScoreStage,
  type ImportSummary,
  type ScoringStage,
} from "@/api/scores";
import type { EventItem } from "@/api/events";
import { ApiError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatDateTimeTR(value: string): string {
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UnmatchedList({ rows }: { rows: ImportSummary["unmatched"] }) {
  if (rows.length === 0) return null;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">
        Sitede kaydı bulunamayan {rows.length} sporcu (puanları yine de
        hesaplandı)
      </summary>
      <ul className="mt-2 grid gap-1 pl-4 sm:grid-cols-2">
        {rows.map((r, i) => (
          <li key={i} className="text-muted-foreground">
            <span className="font-medium text-foreground">{r.name}</span> ·{" "}
            {r.category_code} · {r.club_name}
          </li>
        ))}
      </ul>
    </details>
  );
}

function StageRow({
  eventId,
  stage,
  label,
}: {
  eventId: number;
  stage: ScoringStage;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadScoreCsv(eventId);
  const importInbox = useImportScoreInbox(eventId);
  const remove = useDeleteScoreStage(eventId);
  const [error, setError] = useState<string | null>(null);
  const busy = upload.isPending || importInbox.isPending || remove.isPending;

  const imp = stage.import;
  const inbox = stage.inbox;

  function fail(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : fallback);
  }

  async function handlePick(file: File) {
    if (!/\.csv$/i.test(file.name)) {
      setError("Yalnızca .csv dosyası yüklenebilir.");
      return;
    }
    setError(null);
    try {
      await upload.mutateAsync({ stage: stage.stage_no, file });
    } catch (err) {
      fail(err, "CSV içe aktarılamadı.");
    }
  }

  async function handleImportInbox() {
    setError(null);
    try {
      await importInbox.mutateAsync(stage.stage_no);
    } catch (err) {
      fail(err, "FTP dosyası içe aktarılamadı.");
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${label} sonuçları ve CSV dosyası silinsin mi?`)) return;
    setError(null);
    try {
      await remove.mutateAsync(stage.stage_no);
    } catch (err) {
      fail(err, "Silinemedi.");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{label}</p>
            {imp ? (
              <Badge variant="success">İçe aktarıldı</Badge>
            ) : (
              <Badge variant="muted">Sonuç yok</Badge>
            )}
          </div>
          {imp && (
            <p className="text-xs text-muted-foreground">
              {imp.rows_total} sporcu · {imp.rows_matched} sitedeki sporcuyla
              eşleşti · {formatDateTimeTR(imp.imported_at)} ·{" "}
              {imp.source === "ftp" ? "FTP" : "panelden yüklendi"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handlePick(file);
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
            {imp ? "Yeni CSV yükle" : "CSV yükle"}
          </Button>
          {imp && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
            >
              {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Sil
            </Button>
          )}
        </div>
      </div>

      {inbox && inbox.is_new && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Inbox className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>
              FTP ile {imp ? "yeni bir" : "bir"} dosya geldi:{" "}
              <code>{inbox.name}</code> ({formatDateTimeTR(inbox.modified_at)}).
              Puanlar, siz içe aktarana kadar değişmez.
            </span>
          </div>
          <Button size="sm" disabled={busy} onClick={handleImportInbox}>
            {importInbox.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Download />
            )}
            İçe aktar
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {imp && <UnmatchedList rows={imp.unmatched} />}
    </div>
  );
}

/**
 * Puanlı sonuçlar: OE2010 sonuç CSV'si gün bazında içe aktarılır, ferdi puan
 * (birincinin süresi × 1000 / sporcunun süresi) içe aktarma anında hesaplanır.
 */
export function EventScoringSection({ event }: { event: EventItem }) {
  const { data, isLoading, isError } = useScoringStatus(event.id);
  const anyImported = !!data?.stages.some((s) => s.import);
  const multiDay = (data?.stages.length ?? 1) > 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Puanlı Sonuçlar (CSV)</CardTitle>
          {anyImported && (
            <Link
              to={`/sonuclar/${event.id}`}
              target="_blank"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ExternalLink /> Puan tablosunu gör
            </Link>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          OE2010 → "Raporu dışa aktar" → "Virgülle ayrılmış sütunlar (CSV)",
          ayraç noktalı virgül. Puan her gün ve kategori için ayrı hesaplanır:
          birincinin süresi × 1000 / sporcunun süresi; MP, DNF, DSQ ve DNS 0
          alır. Dosya TC numaraları içerdiği için gizli klasörde saklanır,
          sitede yayınlanmaz.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : isError || !data ? (
          <p className="text-sm text-destructive">Durum yüklenemedi.</p>
        ) : (
          <>
            {data.stages.map((s) => (
              <StageRow
                key={s.stage_no}
                eventId={event.id}
                stage={s}
                label={multiDay ? `${s.stage_no}. Gün` : "Yarış sonucu"}
              />
            ))}
            {data.other_files.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>
                  FTP gelen kutusunda tanınmayan dosya var:{" "}
                  {data.other_files.map((f) => (
                    <code key={f} className="mr-1">
                      {f}
                    </code>
                  ))}
                  — dosya adı <code>gun1.csv</code>, <code>gun2.csv</code>{" "}
                  biçiminde olmalı.
                </span>
              </div>
            )}
            {anyImported && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Puan tablosu Sonuçlar sayfasında yayında.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
