import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface CarouselSlide {
  id: number;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

/** Public: yalnızca aktif slide'lar, sort_order sırasıyla. */
export function useCarousel() {
  return useQuery({
    queryKey: ["carousel"],
    queryFn: async () => {
      const { data } = await api.get<{ items: CarouselSlide[] }>("/carousel");
      return data.items;
    },
  });
}

/** Admin: tüm slide'lar (pasifler dahil). */
export function useAdminCarousel() {
  return useQuery({
    queryKey: ["carousel", "admin"],
    queryFn: async () => {
      const { data } = await api.get<{ items: CarouselSlide[] }>(
        "/admin/carousel",
      );
      return data.items;
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["carousel"] });
}

export interface SlideMeta {
  title?: string | null;
  subtitle?: string | null;
  link_url?: string | null;
  is_active?: boolean;
}

export function useCreateSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { file: File } & SlideMeta) => {
      const fd = new FormData();
      fd.append("image", vars.file);
      if (vars.title != null) fd.append("title", vars.title);
      if (vars.subtitle != null) fd.append("subtitle", vars.subtitle);
      if (vars.link_url != null) fd.append("link_url", vars.link_url);
      fd.append("is_active", vars.is_active === false ? "0" : "1");
      const { data } = await api.post<CarouselSlide>("/admin/carousel", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number } & SlideMeta) => {
      const { id, ...body } = vars;
      const { data } = await api.put<CarouselSlide>(
        `/admin/carousel/${id}`,
        body,
      );
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/carousel/${id}`);
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Yeni sıralama: id dizisi (0. eleman en üstte). */
export function useReorderSlides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: number[]) => {
      await api.post("/admin/carousel/reorder", { order });
    },
    onSuccess: () => invalidate(qc),
  });
}
