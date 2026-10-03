import { useRef, type ReactNode } from "react";
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tek dosya satırı: durum + görüntüle/indir + yükle/değiştir + sil.
 * Belgeler, sonuç dosyaları ve SKB aynı görünümü paylaşsın diye ortak.
 */
export function EventFileRow({
  label,
  present,
  statusText,
  accept,
  viewHref,
  downloadHref,
  onPick,
  onDelete,
  uploading,
  deleting,
  children,
}: {
  label: string;
  present: boolean;
  /** "Yüklü" yerine özel metin (ör. dosya adı + boyut). */
  statusText?: string;
  /** input accept değeri, ör. "application/pdf" veya ".skb,.zip" */
  accept: string;
  viewHref?: string;
  downloadHref?: string;
  onPick: (file: File) => void;
  onDelete?: () => void;
  uploading?: boolean;
  deleting?: boolean;
  /** Satırın altına eklenen not/uyarı. */
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = !!uploading || !!deleting;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-md",
              present
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <FileText className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {statusText ?? (present ? "Yüklü" : "Dosya yok")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {present && viewHref && (
            <a
              href={viewHref}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ExternalLink /> Görüntüle
            </a>
          )}
          {present && downloadHref && (
            <a
              href={downloadHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Download /> İndir
            </a>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // aynı dosya tekrar seçilebilsin
              if (file) onPick(file);
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {present ? "Değiştir" : "Yükle"}
          </Button>
          {present && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Sil
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/** "1,4 MB" gibi kısa boyut metni. */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1).replace(".", ",")} ${units[i]}`;
}
