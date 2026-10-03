import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export type PostKind = "announcement" | "news";

export interface PostListItem {
  id: number;
  kind: PostKind;
  title: string;
  slug: string;
  status: string;
  cover_url: string | null;
  published_at: string | null;
  created_at: string;
}

export interface PostMedia {
  id: number;
  url: string;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
}

export interface PostDetail extends PostListItem {
  body: string | null;
  media: PostMedia[];
}

export function usePosts(kind: PostKind) {
  return useQuery({
    queryKey: ["posts", kind],
    queryFn: async () => {
      const { data } = await api.get<{ items: PostListItem[] }>("/posts", {
        params: { kind },
      });
      return data.items;
    },
  });
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: ["post", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await api.get<{ item: PostDetail }>(`/posts/${slug}`);
      return data.item;
    },
  });
}
