import { Shield } from "lucide-react";
import { useReferees } from "@/api/kurumsal";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Hakemlerimiz() {
  const { data, isLoading, isError } = useReferees();

  return (
    <div>
      <PageHeader title="Hakemlerimiz" description="Ordu Oryantiring hakem kadrosu." />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Liste yüklenemedi" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Henüz hakem eklenmemiş" icon={Shield} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id} className="flex items-center gap-4 p-4">
              <div className="size-14 shrink-0 overflow-hidden rounded-full bg-muted">
                {r.photo_url ? (
                  <img
                    src={r.photo_url}
                    alt={r.full_name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center font-semibold text-muted-foreground">
                    {initials(r.full_name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="truncate font-semibold">{r.full_name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {r.referee_type && (
                    <Badge variant="secondary">{r.referee_type.name}</Badge>
                  )}
                  {r.license_no && (
                    <span className="text-xs text-muted-foreground">
                      Lisans: {r.license_no}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
