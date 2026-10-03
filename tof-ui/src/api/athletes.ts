import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface Category {
  id: number;
  code: string;
  name: string;
  gender: string | null;
  min_birth_year: number | null;
  max_birth_year: number | null;
}

/** GET /api/categories — sporcu formu kategori seçimi. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get<{ items: Category[] }>("/categories");
      return data.items;
    },
    staleTime: 5 * 60_000,
  });
}

/** Sporcu oluştur/güncelle gövdesi. Backend: first_name/last_name/gender/national_id/category_id zorunlu. */
export interface AthleteInput {
  first_name: string;
  last_name: string;
  gender: "M" | "F";
  national_id: string;
  category_id: number;
  birth_year?: number | null;
  license_no?: string | null;
  si_chip_no?: string | null;
}

function invalidateAthletes(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["my-athletes"] });
}

export function useCreateAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AthleteInput) => {
      const { data } = await api.post<{ id: number }>("/athletes", input);
      return data;
    },
    onSuccess: () => invalidateAthletes(qc),
  });
}

export function useUpdateAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; input: Partial<AthleteInput> }) => {
      await api.put(`/athletes/${vars.id}`, vars.input);
    },
    onSuccess: () => invalidateAthletes(qc),
  });
}

export function useDeleteAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/athletes/${id}`);
    },
    onSuccess: () => invalidateAthletes(qc),
  });
}
