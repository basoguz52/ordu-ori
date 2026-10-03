import { useContentPage } from "@/api/pages";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sabit slug'lı kurumsal içerik sayfası (Federasyonumuz, Antrenörlerimiz).
 * İçerik henüz girilmemişse (404) hata değil, "yakında" mesajı gösterir.
 */
export function ContentPageView({
  slug,
  fallbackTitle,
}: {
  slug: string;
  fallbackTitle: string;
}) {
  const { data, isLoading } = useContentPage(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={data?.title ?? fallbackTitle} />
      {data?.body ? (
        <div
          className="space-y-4 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: data.body }}
        />
      ) : (
        <EmptyState
          title="İçerik yakında eklenecek"
          description="Bu sayfa için içerik hazırlanıyor."
        />
      )}
    </div>
  );
}
