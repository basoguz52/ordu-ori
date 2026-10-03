import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { usePosts, type PostKind } from "@/api/posts";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { formatDateTR } from "@/lib/format";

export function PostListPage({
  kind,
  title,
  description,
  basePath,
}: {
  kind: PostKind;
  title: string;
  description?: string;
  basePath: string;
}) {
  const { data, isLoading, isError } = usePosts(kind);

  return (
    <div>
      <PageHeader title={title} description={description} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="İçerik yüklenemedi"
          description="Lütfen daha sonra tekrar deneyin."
        />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Henüz içerik yok" description="Yakında burada olacak." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link key={p.id} to={`${basePath}/${p.slug}`} className="group">
              <Card className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-primary/40">
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  {p.cover_url ? (
                    <img
                      src={p.cover_url}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground/30">
                      <CalendarDays className="size-10" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="font-semibold leading-snug transition-colors group-hover:text-primary">
                    {p.title}
                  </h3>
                  <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatDateTR(p.published_at ?? p.created_at)}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
