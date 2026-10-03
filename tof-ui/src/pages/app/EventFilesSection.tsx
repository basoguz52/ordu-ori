import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  useUploadEventFile,
  useDeleteEventFile,
  type EventItem,
  type EventFileKind,
} from "@/api/events";
import { ApiError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventFileRow } from "@/pages/app/EventFileRow";

const KINDS: { kind: EventFileKind; label: string; urlKey: keyof EventItem }[] = [
  { kind: "bulletin", label: "Bülten", urlKey: "bulletin_url" },
  { kind: "oncikis", label: "Ön Çıkış Listesi", urlKey: "oncikis_url" },
  { kind: "kesincikis", label: "Kesin Çıkış Listesi", urlKey: "kesincikis_url" },
];

function DocRow({
  eventId,
  kind,
  label,
  url,
  onError,
}: {
  eventId: number;
  kind: EventFileKind;
  label: string;
  url?: string;
  onError: (msg: string | null) => void;
}) {
  const upload = useUploadEventFile(eventId);
  const remove = useDeleteEventFile(eventId);

  async function handlePick(file: File) {
    if (file.type !== "application/pdf") {
      onError(`${label}: yalnızca PDF yüklenebilir.`);
      return;
    }
    onError(null);
    try {
      await upload.mutateAsync({ kind, file });
    } catch (err) {
      onError(err instanceof ApiError ? err.message : `${label} yüklenemedi.`);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${label} dosyası silinsin mi?`)) return;
    onError(null);
    try {
      await remove.mutateAsync(kind);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : `${label} silinemedi.`);
    }
  }

  return (
    <EventFileRow
      label={label}
      present={!!url}
      accept="application/pdf"
      viewHref={url}
      onPick={handlePick}
      onDelete={handleDelete}
      uploading={upload.isPending}
      deleting={remove.isPending}
    />
  );
}

export function EventFilesSection({ event }: { event: EventItem }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yarışma Belgeleri</CardTitle>
        <p className="text-sm text-muted-foreground">
          Bülten ve çıkış listeleri (yalnızca PDF, en fazla 20 MB). Bu dosyalar
          public sitede herkese görünür.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-3">
          {KINDS.map(({ kind, label, urlKey }) => (
            <DocRow
              key={kind}
              eventId={event.id}
              kind={kind}
              label={label}
              url={event[urlKey] as string | undefined}
              onError={setError}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
