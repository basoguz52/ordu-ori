import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { PostKind, PostListItem, PostDetail, PostMedia } from "@/api/posts";
import type { ContentPageData } from "@/api/pages";

export type { PostKind, PostListItem, PostDetail, PostMedia };

// ---------- Posts (admin) ----------

/** GET /api/admin/posts?kind= — tüm durumlar (taslak dahil). */
export function useAdminPosts(kind: PostKind) {
  return useQuery({
    queryKey: ["admin-posts", kind],
    queryFn: async () => {
      const { data } = await api.get<{ items: PostListItem[] }>("/admin/posts", {
        params: { kind },
      });
      return data.items;
    },
  });
}

/** GET /api/admin/posts/{id} — düzenleme için tam kayıt. */
export function useAdminPost(id: number | null) {
  return useQuery({
    queryKey: ["admin-post", id],
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<{ item: PostDetail }>(`/admin/posts/${id}`);
      return data.item;
    },
  });
}

export interface PostInput {
  title: string;
  kind: PostKind;
  status: "published" | "draft";
  body?: string | null;
}

function invalidatePosts(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-posts"] });
  qc.invalidateQueries({ queryKey: ["posts"] }); // public liste
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostInput) => {
      const { data } = await api.post<{ id: number; slug: string }>(
        "/admin/posts",
        input,
      );
      return data;
    },
    onSuccess: () => invalidatePosts(qc),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; input: Partial<PostInput> }) => {
      await api.put(`/admin/posts/${vars.id}`, vars.input);
    },
    onSuccess: (_d, vars) => {
      invalidatePosts(qc);
      qc.invalidateQueries({ queryKey: ["admin-post", vars.id] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/posts/${id}`);
    },
    onSuccess: () => invalidatePosts(qc),
  });
}

// ---------- Kapak & medya ----------

function invalidatePost(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: ["admin-post", id] });
  qc.invalidateQueries({ queryKey: ["admin-posts"] });
  qc.invalidateQueries({ queryKey: ["posts"] });
}

export function useUploadPostCover(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("cover", file);
      const { data } = await api.post<{ cover_url: string }>(
        `/admin/posts/${id}/cover`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => invalidatePost(qc, id),
  });
}

export function useDeletePostCover(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/posts/${id}/cover`);
    },
    onSuccess: () => invalidatePost(qc, id),
  });
}

export function useUploadPostMedia(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("media", file);
      const { data } = await api.post<PostMedia>(
        `/admin/posts/${id}/media`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => invalidatePost(qc, id),
  });
}

export function useDeletePostMedia(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: number) => {
      await api.delete(`/admin/posts/${id}/media/${mediaId}`);
    },
    onSuccess: () => invalidatePost(qc, id),
  });
}

// ---------- Content pages (admin) ----------

/** GET /api/admin/pages — mevcut kurumsal içerik sayfaları. */
export function useAdminPages() {
  return useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const { data } = await api.get<{ items: ContentPageData[] }>("/admin/pages");
      return data.items;
    },
  });
}

export interface PageInput {
  title: string;
  body?: string | null;
}

/** PUT /api/admin/pages/{slug} — upsert. */
export function useUpsertPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { slug: string; input: PageInput }) => {
      const { data } = await api.put<ContentPageData>(
        `/admin/pages/${vars.slug}`,
        vars.input,
      );
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-pages"] });
      qc.invalidateQueries({ queryKey: ["page", vars.slug] }); // public görünüm
    },
  });
}
