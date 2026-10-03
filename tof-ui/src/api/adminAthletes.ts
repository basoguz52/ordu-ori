import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { AthleteInput } from "@/api/athletes";
import type { MyAthlete } from "@/api/me";

/** Admin sporcu satırı, self-service ile aynı şekil. */
export type AdminAthleteRow = MyAthlete;

export interface AdminAthleteInput extends AthleteInput {
  club_id: number;
}

export interface AdminAthleteFilters {
  club_id?: number;
  category_id?: number;
}

/** GET /api/admin/athletes — tüm kulüpler (kulüp/kategori filtreli). */
export function useAdminAthletes(filters: AdminAthleteFilters = {}) {
  return useQuery({
    queryKey: ["admin-athletes", filters],
    queryFn: async () => {
      const params: Record<string, number> = {};
      if (filters.club_id) params.club_id = filters.club_id;
      if (filters.category_id) params.category_id = filters.category_id;
      const { data } = await api.get<{ items: AdminAthleteRow[] }>(
        "/admin/athletes",
        { params },
      );
      return data.items;
    },
  });
}

function invalidateAthletes(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-athletes"] });
  qc.invalidateQueries({ queryKey: ["my-athletes"] }); // kulüp yön. kendi listesi
  qc.invalidateQueries({ queryKey: ["admin-clubs"] }); // athletes_count değişir
}

export function useCreateAdminAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminAthleteInput) => {
      const { data } = await api.post<{ id: number }>("/admin/athletes", input);
      return data;
    },
    onSuccess: () => invalidateAthletes(qc),
  });
}

export function useUpdateAdminAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; input: Partial<AdminAthleteInput> }) => {
      await api.put(`/admin/athletes/${vars.id}`, vars.input);
    },
    onSuccess: () => invalidateAthletes(qc),
  });
}

export function useDeleteAdminAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/athletes/${id}`);
    },
    onSuccess: () => invalidateAthletes(qc),
  });
}
