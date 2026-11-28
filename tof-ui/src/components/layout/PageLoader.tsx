import { Loader2 } from "lucide-react";

/** Lazy yüklenen sayfa gelene kadar gösterilen sade gösterge. */
export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" aria-label="Yükleniyor" />
    </div>
  );
}
