import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Server,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  useEvent,
  useEventFiles,
  useUploadSkb,
  useDeleteSkb,
  useUploadResultFile,
  useDeleteResultFile,
  useStorageCheck,
  skbDownloadUrl,
  type EventItem,
  type ResultFileType,
  type StorageCheck,
} from "@/api/events";
import { useResultProbes, resultFileUrl } from "@/api/results";
import { useFtpSettings, eventRemoteDir } from "@/api/settings";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { CopyField } from "@/components/common/CopyField";
import { EventFilesSection } from "@/pages/app/EventFilesSection";
import { EventFileRow, formatBytes } from "@/pages/app/EventFileRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRangeTR, formatDateTR } from "@/lib/format";
import { cn } from "@/lib/utils";

const RESULT_ROWS: { type: ResultFileType; label: string }[] = [
  { type: "official", label: "Genel Klasman (official)" },
  { type: "splits", label: "Ara Zamanlar (splits)" },
  { type: "overall", label: "Toplu Sonuçlar (overall)" },
];

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ---------------------------- Sonuç dosyaları ---------------------------- */

function ResultRow({
  eventId,
  folderKey,
  type,
  label,
  present,
  onError,
}: {
  eventId: number;
  folderKey: string;
  type: ResultFileType;
  label: string;
  present: boolean;
  onError: (msg: string | null) => void;
}) {
  const upload = useUploadResultFile(eventId);
  const remove = useDeleteResultFile(eventId);

  async function handlePick(file: File) {
    const ok = /\.(html?|pdf)$/i.test(file.name);
    if (!ok) {
      onError(`${label}: yalnızca .html veya .pdf yüklenebilir.`);
      return;
    }
    onError(null);
    try {
      await upload.mutateAsync({ type, file });
    } catch (err) {
      onError(err instanceof ApiError ? err.message : `${label} yüklenemedi.`);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${label} dosyası silinsin mi?`)) return;
    onError(null);
    try {
      await remove.mutateAsync(type);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : `${label} silinemedi.`);
    }
  }

  return (
    <EventFileRow
      label={label}
      present={present}
      accept=".html,.htm,application/pdf"
      viewHref={resultFileUrl(folderKey, type)}
      onPick={handlePick}
      onDelete={handleDelete}
      uploading={upload.isPending}
      deleting={remove.isPending}
    />
  );
}

function ResultsSection({ event }: { event: EventItem }) {
  const [error, setError] = useState<string | null>(null);
  const folderKey = event.folder_key ?? "";
  const { data: probes, isLoading } = useResultProbes(
    folderKey ? [folderKey] : [],
  );
  const probe = probes?.[folderKey];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sonuç Dosyaları</CardTitle>
        <p className="text-sm text-muted-foreground">
          OE2010 çıktıları (.html veya .pdf, en fazla 20 MB). Yüklenen dosyalar
          public Sonuçlar sayfasında görünür; FTP ile bırakılan dosyalar da
          burada listelenir.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorBanner message={error} />
        {!folderKey ? (
          <EmptyState
            title="Klasör anahtarı yok"
            description="Bu yarışın folder_key değeri boş; önce bir belge yükleyin ya da yarışı kaydedin."
          />
        ) : isLoading ? (
          <Skeleton className="h-20 rounded-lg" />
        ) : (
          <div className="space-y-3">
            {RESULT_ROWS.map(({ type, label }) => (
              <ResultRow
                key={type}
                eventId={event.id}
                folderKey={folderKey}
                type={type}
                label={label}
                present={!!probe?.[type]}
                onError={setError}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------- Gizli yönetim dosyası ------------------------- */

const STORAGE_MODE_LABEL: Record<StorageCheck["mode"], string> = {
  env: "Elle ayarlanan klasör (PRIVATE_UPLOADS_DIR)",
  outside_webroot: "Web kökünün dışında",
  htaccess_guarded: "uploads/_private (.htaccess korumalı)",
  none: "Yazılabilir klasör bulunamadı",
};

function StorageStatus({ result }: { result: StorageCheck }) {
  const unsafe = result.http_accessible === true;
  return (
    <div className="space-y-2 rounded-lg border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Depolama:</span>
        <span className="text-muted-foreground">
          {STORAGE_MODE_LABEL[result.mode]}
        </span>
        {result.writable ? (
          <Badge variant="success">Yazılabilir</Badge>
        ) : (
          <Badge variant="destructive">Yazılamıyor</Badge>
        )}
      </div>
      {result.root && (
        <p className="break-all font-mono text-xs text-muted-foreground">
          {result.root}
        </p>
      )}
      <p className={cn(unsafe && "font-medium text-destructive")}>
        {result.http_accessible === null
          ? "Dosyanın web adresi yok — tarayıcıdan erişilemez."
          : unsafe
            ? "UYARI: Test dosyası web'den indirilebildi. PRIVATE_UPLOADS_DIR ile web kökü dışında bir klasör ayarlayın."
            : "Web'den erişim engellendi (test dosyası indirilemedi)."}
      </p>
    </div>
  );
}

function PrivateSection({ event }: { event: EventItem }) {
  const [error, setError] = useState<string | null>(null);
  const { data: files, isLoading } = useEventFiles(event.id);
  const upload = useUploadSkb(event.id);
  const remove = useDeleteSkb(event.id);
  const check = useStorageCheck();

  const skb = files?.find((f) => f.kind === "skb");

  async function handlePick(file: File) {
    if (!/\.(skb|zip)$/i.test(file.name)) {
      setError("Yalnızca .skb veya .zip dosyası yüklenebilir.");
      return;
    }
    setError(null);
    try {
      await upload.mutateAsync(file);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "SKB yüklenemedi.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("SKB dosyası silinsin mi?")) return;
    setError(null);
    try {
      await remove.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "SKB silinemedi.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Yönetim Dosyası (gizli)</CardTitle>
          <Badge variant="muted">Public sitede görünmez</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Zaman tutma yazılımı yedeği (.skb veya .zip, en fazla 50 MB). Yarış
          başına tek dosya tutulur; yenisi eskisinin yerine geçer. Yalnızca
          yöneticiler indirebilir.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorBanner message={error} />
        {isLoading ? (
          <Skeleton className="h-20 rounded-lg" />
        ) : (
          <EventFileRow
            label="SKB Dosyası"
            present={!!skb}
            statusText={
              skb
                ? [
                    skb.original_name ?? "skb",
                    formatBytes(skb.size_bytes),
                    formatDateTR(skb.created_at),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Dosya yok"
            }
            accept=".skb,.zip"
            downloadHref={skbDownloadUrl(event.id)}
            onPick={handlePick}
            onDelete={handleDelete}
            uploading={upload.isPending}
            deleting={remove.isPending}
          />
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={check.isPending}
              onClick={() => check.mutate()}
            >
              {check.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShieldCheck />
              )}
              Depolama testini çalıştır
            </Button>
            <span className="text-xs text-muted-foreground">
              Dosyanın web'den gerçekten indirilemediğini doğrular.
            </span>
          </div>
          {check.isError && (
            <ErrorBanner
              message={
                check.error instanceof ApiError
                  ? check.error.message
                  : "Depolama testi çalıştırılamadı."
              }
            />
          )}
          {check.data && <StorageStatus result={check.data} />}
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------- FTP bilgileri kartı ------------------------- */

function FtpSection({ event }: { event: EventItem }) {
  const { data: ftp, isLoading } = useFtpSettings();
  const folderKey = event.folder_key ?? "";
  const configured = !!ftp?.host;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Server className="size-5 text-primary" />
          <CardTitle>FTP ile Yükleme Bilgileri</CardTitle>
          <Badge variant="muted">Yalnızca yöneticiler görür</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          OE2010'un (veya FileZilla'nın) FTP ayarına bu değerleri yapıştırın.
          Aşağıdaki her alan tek tıkla kopyalanır.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : !configured ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                FTP bilgileri henüz girilmemiş. Önce Ayarlar sayfasından FTP
                sunucusu, kullanıcı ve şifreyi kaydedin.
              </span>
            </div>
            <Link
              to="/app/ayarlar"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Settings /> Ayarlara Git
            </Link>
          </div>
        ) : !folderKey ? (
          <EmptyState
            title="Klasör anahtarı yok"
            description="Hedef dizin hesaplanamıyor; önce bir dosya yükleyin ya da yarışı kaydedin."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <CopyField label="FTP Sunucu" value={ftp.host} />
              <CopyField label="Port" value={ftp.port || "21"} />
              <CopyField label="Kullanıcı Adı" value={ftp.user} />
              <CopyField label="Şifre" value={ftp.pass} secret />
              <CopyField
                className="sm:col-span-2"
                label="Hedef Dizin (bu yarış)"
                value={eventRemoteDir(ftp.base_dir, folderKey)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Dosya adları (yüklerken bu adları kullanın)
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <CopyField label="Genel Klasman" value="official.html" />
                <CopyField label="Ara Zamanlar" value="splits.html" />
                <CopyField label="Toplu Sonuçlar" value="overall.html" />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="mb-2 font-medium">OE2010 ile adım adım</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>OE2010'da sonuç HTML dosyasını oluşturun.</li>
                <li>
                  İnternet/FTP ayarına yukarıdaki Sunucu, Kullanıcı, Şifre ve
                  Hedef Dizin değerlerini yapıştırın
                  {ftp.passive === "1" ? " (pasif mod açık)" : ""}.
                </li>
                <li>
                  Dosya adını <code>official.html</code> yapın (ara zaman{" "}
                  <code>splits.html</code>, toplu <code>overall.html</code>).
                </li>
                <li>Yükleyin.</li>
                <li>
                  Yukarıdaki <strong>Sonuç Dosyaları</strong> bölümünden
                  “Görüntüle” ile kontrol edin.
                </li>
              </ol>
              {ftp.note && (
                <p className="mt-3 border-t pt-3 text-muted-foreground">
                  {ftp.note}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <Upload className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                FTP zor geldiyse dosyayı doğrudan yukarıdaki{" "}
                <strong>Sonuç Dosyaları</strong> bölümünden de yükleyebilirsiniz.
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Sayfa --------------------------------- */

export default function EventFiles() {
  const { id } = useParams();
  const { data: event, isLoading, isError } = useEvent(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !event) {
    return <EmptyState title="Yarış bulunamadı" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dosyalar & Sonuçlar"
        description={`${event.name} · ${formatDateRangeTR(event.start_date, event.end_date)}`}
        actions={
          <Link
            to={`/app/etkinlikler/${event.id}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ArrowLeft /> Yarışı Düzenle
          </Link>
        }
      />

      <EventFilesSection event={event} />
      <ResultsSection event={event} />
      <FtpSection event={event} />
      <PrivateSection event={event} />
    </div>
  );
}
