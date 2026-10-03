import { Users, Mail, Phone, Globe } from "lucide-react";
import { useClubs, type ClubItem } from "@/api/kurumsal";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ClubCard({ c }: { c: ClubItem }) {
  const hasContact = !!(c.contact_email || c.contact_phone || c.website);
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-4">
        {c.logo_url ? (
          <img
            src={c.logo_url}
            alt={`${c.name} logosu`}
            className="size-14 shrink-0 rounded-lg border bg-background object-contain p-1"
          />
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-7" />
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <p className="font-semibold leading-snug">{c.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{c.code}</Badge>
            <span className="text-xs text-muted-foreground">
              {c.athlete_count} sporcu
            </span>
          </div>
        </div>
      </div>

      {c.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {c.description}
        </p>
      )}

      {hasContact && (
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3 text-sm">
          {c.contact_email && (
            <a
              href={`mailto:${c.contact_email}`}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary"
            >
              <Mail className="size-3.5" /> {c.contact_email}
            </a>
          )}
          {c.contact_phone && (
            <a
              href={`tel:${c.contact_phone}`}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary"
            >
              <Phone className="size-3.5" /> {c.contact_phone}
            </a>
          )}
          {c.website && (
            <a
              href={c.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary"
            >
              <Globe className="size-3.5" /> Web sitesi
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

export default function Kuluplerimiz() {
  const { data, isLoading, isError } = useClubs();

  return (
    <div>
      <PageHeader title="Kulüplerimiz" description="Ordu’daki oryantiring kulüpleri." />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Liste yüklenemedi" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Henüz kulüp eklenmemiş" icon={Users} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <ClubCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
