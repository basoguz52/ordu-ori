import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface ContentPageData {
  slug: string;
  title: string;
  body: string | null;
  updated_at: string;
}

export function useContentPage(slug: string) {
  return useQuery({
    queryKey: ["page", slug],
    enabled: !!slug,
    retry: false, // 404 (henüz içerik girilmemiş) için tekrar deneme
    queryFn: async () => {
      const { data } = await api.get<{ item: ContentPageData }>(`/pages/${slug}`);
      return data.item;
    },
  });
}
