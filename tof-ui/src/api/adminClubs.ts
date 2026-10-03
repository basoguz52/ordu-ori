import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface AdminClubManager {
  id: number;
  full_name: string;
  email: string;
}

export interface AdminClub {
  id: number;
  name: string;
  code: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  manager_user_id: number | null;
  manager: AdminClubManager | null;
  athletes_count: number;
}

export interface AdminClubInput {
  name: string;
  code: string;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  manager_user_id?: number | null;
}

/** GET /api/admin/clubs — tüm kulüpler (yönetici + sporcu sayısı). */
export function useAdminClubs() {
  return useQuery({
    queryKey: ["admin-clubs"],
    queryFn: async () => {
      const { data } = await api.get<{ items: AdminClub[] }>("/admin/clubs");
      return data.items;
    },
  });
}

/** Kulüp değişimi tüm kulüp görünümlerini + yönetici bayrağını etkiler. */
function invalidateClubs(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-clubs"] });
  qc.invalidateQueries({ queryKey: ["clubs"] }); // api/admin.ts useClubs (seçiciler)
  qc.invalidateQueries({ queryKey: ["kurumsal", "kulupler"] }); // public liste
  qc.invalidateQueries({ queryKey: ["admin-users"] }); // yönetici bayrağı
}

export function useCreateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminClubInput) => {
      const { data } = await api.post<{ club: AdminClub }>("/admin/clubs", input);
      return data.club;
    },
    onSuccess: () => invalidateClubs(qc),
  });
}

export function useUpdateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; input: Partial<AdminClubInput> }) => {
      const { data } = await api.put<{ club: AdminClub }>(
        `/admin/clubs/${vars.id}`,
        vars.input,
      );
      return data.club;
    },
    onSuccess: () => invalidateClubs(qc),
  });
}

export function useDeleteClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/clubs/${id}`);
    },
    onSuccess: () => invalidateClubs(qc),
  });
}

export function useUploadAdminClubLogo(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("logo", file);
      const { data } = await api.post<{ logo_url: string }>(
        `/admin/clubs/${id}/logo`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => invalidateClubs(qc),
  });
}

export function useDeleteAdminClubLogo(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/clubs/${id}/logo`);
    },
    onSuccess: () => invalidateClubs(qc),
  });
}
