import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { usePost } from "@/api/posts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PostDetailPage({
  basePath,
  backLabel,
}: {
  basePath: string;
  backLabel: string;
}) {
  const { slug = "" } = useParams();
  const { data, isLoading, isError } = usePost(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          to={basePath}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
        >
          <ArrowLeft /> {backLabel}
        </Link>
        <EmptyState title="İçerik bulunamadı" />
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        to={basePath}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        <ArrowLeft /> {backLabel}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.title}</h1>
      <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />
        {formatDateTR(data.published_at ?? data.created_at)}
      </div>

      {data.cover_url && (
        <img
          src={data.cover_url}
          alt={data.title}
          className="mt-6 aspect-[16/9] w-full rounded-xl border object-cover"
        />
      )}

      {data.body && (
        <div
          className="mt-6 space-y-4 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: data.body }}
        />
      )}

      {data.media.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.media.map((m) => (
            <img
              key={m.id}
              src={m.url}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded-lg border object-cover"
            />
          ))}
        </div>
      )}
    </article>
  );
}
