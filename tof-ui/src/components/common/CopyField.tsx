import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tek satırlık kopyalanabilir alan: etiket + monospace değer + "Kopyala" düğmesi.
 * `secret` verilirse değer maskelenir, göz ikonuyla açılır/kapanır.
 */
export function CopyField({
  label,
  value,
  secret = false,
  className,
}: {
  label: string;
  value: string;
  secret?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Pano erişimi yoksa sessizce geç (kullanıcı elle seçip kopyalayabilir).
    }
  }

  const shown = secret && !revealed ? "•".repeat(Math.min(value.length, 12) || 8) : value;

  return (
    <div className={cn("space-y-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-stretch gap-2">
        <code className="flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
          {value ? shown : <span className="text-muted-foreground">—</span>}
        </code>
        {secret && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={revealed ? "Gizle" : "Göster"}
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!value}
          onClick={handleCopy}
        >
          {copied ? <Check className="text-green-600" /> : <Copy />}
          {copied ? "Kopyalandı" : "Kopyala"}
        </Button>
      </div>
    </div>
  );
}
